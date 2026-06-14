'use server';

import { createClient } from '@/lib/supabase/server';
import { SupportTicket, CreateTicketInput } from '@/types/support';

// --- CLIENT SUPPORT ACTIONS ---

export async function getSupportTickets() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    // Fetch service requests of type 'other' (mapped to support tickets)
    const { data, error } = await supabase.from('service_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'other')
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Map to Ticket interface expected by UI
    const tickets: SupportTicket[] = data.map((t: any) => ({
        id: t.request_id_display || t.id,
        subject: t.details?.subject || 'Support Ticket',
        category: t.details?.category || 'General',
        status: t.status === 'pending' ? 'open' : t.status === 'completed' ? 'resolved' : 'pending',
        priority: t.details?.priority || 'medium',
        createdAt: new Date(t.created_at).toLocaleDateString(),
        lastReply: 'Just now', // Placeholder - ideally fetch latest message
        lastMessage: t.details?.description || '',
        isFromSupport: false,
        resolvedAt: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : undefined,
        resolution: t.details?.resolution || ''
    }));

    return { success: true, data: tickets };
}

export async function createSupportTicket(data: CreateTicketInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const { subject, description, category, priority } = data;

    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Insert into service_requests
    const { data: ticket, error } = await supabase.from('service_requests').insert({
        user_id: user.id,
        type: 'other',
        status: 'pending',
        request_id_display: ticketId,
        details: {
            subject,
            description,
            category,
            priority,
            is_support_ticket: true
        }
    }).select().single();

    if (error) return { success: false, error: error.message };

    // Send confirmation email to customer
    try {
        const { sendMail } = await import('@/lib/email');

        // Get user email from profile
        const { data: profile } = await supabase.from('profiles')
            .select('email, full_name')
            .eq('id', user.id)
            .single();

        const userEmail = profile?.email || user.email || '';
        const userName = profile?.full_name || 'Customer';

        if (userEmail) {
            await sendMail({
                to: userEmail,
                subject: `Support Ticket Received — ${ticketId}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
                        <div style="background: linear-gradient(135deg, #0d9488, #06b6d4); padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 22px;">HealthMitra Support</h1>
                            <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Your Health, Our Priority</p>
                        </div>
                        <div style="background: white; padding: 28px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
                            <p style="color: #334155; font-size: 16px;">Dear <strong>${userName}</strong>,</p>
                            <p style="color: #475569;">We have received your support request. Our team will get back to you within 24 hours.</p>

                            <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                <p style="margin: 0 0 8px; color: #0f766e; font-weight: bold;">Ticket Details</p>
                                <p style="margin: 4px 0; color: #334155;"><strong>Ticket ID:</strong> ${ticketId}</p>
                                <p style="margin: 4px 0; color: #334155;"><strong>Category:</strong> ${category}</p>
                                <p style="margin: 4px 0; color: #334155;"><strong>Subject:</strong> ${subject}</p>
                                <p style="margin: 4px 0; color: #334155;"><strong>Priority:</strong> ${priority}</p>
                                <p style="margin: 4px 0; color: #334155;"><strong>Status:</strong> Open</p>
                            </div>

                            <p style="color: #475569;">Your message:<br/>
                            <em style="color: #64748b;">"${description}"</em></p>

                            <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                <p style="color: #94a3b8; font-size: 13px; margin: 0;">Need urgent help? Contact us:</p>
                                <p style="color: #0d9488; font-size: 13px; margin: 4px 0;">📞 +91 9818823106 | 📧 service@healthmitraus.com</p>
                                <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0;">© 2025 HealthMitra Systems Pvt Ltd. All rights reserved.</p>
                            </div>
                        </div>
                    </div>
                `
            });
        }

        // Also notify admin
        const adminEmail = process.env.ADMIN_EMAIL || 'service@healthmitraus.com';
        await sendMail({
            to: adminEmail,
            subject: `[New Support Ticket] ${ticketId} — ${category}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px;">
                    <h2 style="color: #0f766e;">New Support Ticket</h2>
                    <p><strong>Ticket ID:</strong> ${ticketId}</p>
                    <p><strong>From:</strong> ${userName} (${userEmail})</p>
                    <p><strong>Category:</strong> ${category}</p>
                    <p><strong>Subject:</strong> ${subject}</p>
                    <p><strong>Priority:</strong> ${priority}</p>
                    <p><strong>Message:</strong><br/>${description}</p>
                </div>
            `
        });
    } catch (emailError) {
        // Email failure should not block ticket creation
        console.error('Support ticket email notification failed:', emailError);
    }

    return { success: true, data: ticket };
}


// --- SERVICE REQUESTS (SUPPORT) ---

export async function getRequests() {
    const supabase = await createClient();

    const { data: requests, error } = await supabase.from('service_requests')
        .select(`
            *,
            profiles:user_id (full_name, email, phone)
        `)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Map to ServiceRequest type
    const mappedRequests = requests.map((r: any) => ({
        id: r.id,
        requestId: r.request_id_display || r.id.substring(0, 8),
        userId: r.user_id,
        customerName: r.profiles?.full_name || 'Guest User',
        customerEmail: r.profiles?.email || '',
        customerContact: r.profiles?.phone || '',
        type: r.type,
        status: r.status,
        description: r.details?.description || r.details?.subject || '',
        priority: r.details?.priority || 'medium',
        requestedAt: new Date(r.created_at).toLocaleDateString() + ' ' + new Date(r.created_at).toLocaleTimeString(),
        notes: r.admin_notes || '', // Ensure admin_notes column is added or use details
        details: r.details
    }));

    return { success: true, data: mappedRequests };
}

export async function getRequestThread(requestId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('request_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
    return { success: true, data: data || [] };
}

export async function updateRequestStatus(id: string, status: string, notes?: string) {
    const supabase = await createClient();

    // Update status
    await supabase.from('service_requests').update({ status }).eq('id', id);

    // Add notes to message thread if provided
    if (notes) {
        await supabase.from('request_messages').insert({
            request_id: id,
            sender_id: (await supabase.auth.getUser()).data.user?.id,
            message: `Status updated to ${status}. Note: ${notes}`,
            // is_internal removed as it's not in schema. could add to JSONB if needed.
        });
    }

    return { success: true, message: 'Status updated successfully' };
}

export async function assignRequest(id: string, adminId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('service_requests').update({ assigned_to: adminId }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Request assigned' };
}

export async function postReply(requestId: string, message: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('request_messages').insert({
        request_id: requestId,
        message,
        sender_id: (await supabase.auth.getUser()).data.user?.id,
    }).select().single();

    if (error) return { success: false, error: error.message };
    return { success: true, data, message: 'Reply sent' };
}

// --- REIMBURSEMENTS ---

export async function getClaims() {
    const supabase = await createClient();
    const { data } = await supabase.from('reimbursement_claims').select('*');
    return { success: true, data: data || [] };
}

export async function processClaim(id: string, status: 'approved' | 'rejected', data: any) {
    const supabase = await createClient();
    const updates: any = { status };
    if (status === 'approved') updates.amount_approved = data.approvedAmount;
    if (status === 'rejected') updates.rejection_reason = data.reason;

    const { error } = await supabase.from('reimbursement_claims').update(updates).eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, message: `Claim ${status} successfully` };
}

