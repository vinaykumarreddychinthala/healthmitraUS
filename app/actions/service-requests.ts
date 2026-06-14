'use server';

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/email";
import { 
    customerTicketUploadedTemplate, 
    customerServiceApprovedTemplate,
    adminBillUploadedTemplate,
    adminTicketUploadedRedemptionTemplate,
    requestReceivedReimbursementTemplate,
    requestReceivedDiagnosticTemplate,
    requestReceivedMedicineTemplate,
    requestReceivedCaretakerTemplate,
    serviceRenderedReimbursementTemplate,
    serviceRenderedDiagnosticTemplate,
    serviceRenderedMedicineTemplate,
    serviceRenderedCaretakerTemplate
} from "@/lib/email-templates";

// --- CLIENT ACTIONS ---

export async function getServiceRequests() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.from('service_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    return { success: true, data };
}

export async function getServiceRequest(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.from('service_requests')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
}

export async function createServiceRequest(data: { type: string; memberId?: string; details: Record<string, any> }) {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    // Service types that any authenticated user can access without a plan
    const FREE_ACCESS_TYPES = ['general', 'emergency', 'voucher', 'support', 'companion', 'bill_reimbursement'];

    if (!FREE_ACCESS_TYPES.includes(data.type)) {
        // For plan-gated services, validate access against user's active plans
        const today = new Date().toISOString().split('T')[0];
        const { data: memberPlans } = await adminClient
            .from('ecard_members')
            .select('*, plans(allowed_services)')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .gte('valid_till', today)
            .lte('valid_from', today);

        let allAllowedServices: string[] = [];
        if (memberPlans && memberPlans.length > 0) {
            memberPlans.forEach((m: any) => {
                const planServices = m.plans?.allowed_services || [];
                allAllowedServices = [...allAllowedServices, ...planServices];
            });
        }

        // If they have any active plan, allow all services (graceful fallback)
        const hasActivePlan = memberPlans && memberPlans.length > 0;
        const serviceAllowed = allAllowedServices.length === 0
            ? hasActivePlan // If allowed_services is empty, any active plan grants access
            : allAllowedServices.includes(data.type);

        if (!serviceAllowed) {
            return {
                success: false,
                error: 'You need an active health plan to book this service. Please purchase a plan first.'
            };
        }
    }

    // Generate request_id_display using UUID to avoid race conditions
    // Format: SR-YYYY-XXXXXX where XXXXXX is first 6 chars of UUID (ensures uniqueness)
    const year = new Date().getFullYear();
    const uniqueSuffix = crypto.randomUUID().replace(/-/g, '').substring(0, 6).toUpperCase();
    const requestIdDisplay = `SR-${year}-${uniqueSuffix}`;

    // If there's a conflict (very unlikely with UUID), append timestamp
    let finalRequestId = requestIdDisplay;
    const { data: existing } = await adminClient
        .from('service_requests')
        .select('id')
        .eq('request_id_display', requestIdDisplay)
        .maybeSingle();
    
    if (existing) {
        finalRequestId = `SR-${year}-${uniqueSuffix}-${Date.now().toString(36).toUpperCase()}`;
    }

    const { data: req, error } = await adminClient.from('service_requests').insert({
        user_id: user.id,
        type: data.type,
        status: 'pending',
        details: data.details,
        request_id_display: finalRequestId,
    }).select().single();

    if (error) {
        console.error('Service request creation error:', error);
        return { success: false, error: error.message };
    }

    // Send acknowledgment email to customer
    try {
        if (user.email) {
            const customerName = user.user_metadata?.full_name || user.email.split('@')[0];
            let htmlContent = customerTicketUploadedTemplate({ customerName, type: data.type, ticketId: finalRequestId });
            
            if (data.type === 'reimbursement') {
                htmlContent = requestReceivedReimbursementTemplate({ customerName });
            } else if (data.type === 'diagnostic') {
                htmlContent = requestReceivedDiagnosticTemplate({ customerName });
            } else if (data.type === 'medicine' || data.type === 'pharmacy') {
                htmlContent = requestReceivedMedicineTemplate({ customerName });
            } else if (data.type === 'caretaker' || data.type === 'nursing') {
                htmlContent = requestReceivedCaretakerTemplate({ customerName });
            }

            await sendMail({
                to: user.email,
                subject: `Service Request Received - ${finalRequestId}`,
                html: htmlContent
            });
        }

        // Notify Admin
        const adminHtml = (data.type === 'reimbursement' || data.type === 'diagnostic' || data.type === 'medicine')
            ? adminTicketUploadedRedemptionTemplate({
                adminName: 'Admin',
                customerName: user.user_metadata?.full_name || user.email || 'User',
                type: data.type,
                ticketId: finalRequestId
              })
            : adminBillUploadedTemplate({
                adminName: 'Admin',
                customerName: user.user_metadata?.full_name || user.email || 'User',
                ticketId: finalRequestId,
                type: data.type
              });

        await sendMail({
            to: process.env.ADMIN_EMAIL || 'service@healthmitraus.com',
            subject: `New Service Request - ${finalRequestId}`,
            html: adminHtml
        });
    } catch (emailErr) {
        console.error('Failed to send service request emails:', emailErr);
    }

    return { success: true, data: req };
}

// --- ADMIN ACTIONS ---

export async function getAdminServiceRequests(filters?: { query?: string, status?: string, type?: string, agentId?: string }) {
    const supabase = await createAdminClient();

    // Fetch requests with user profile and assigned agent profile
    const { data: allData, error } = await supabase.from('service_requests')
        .select(`
            *,
            profiles:user_id (full_name, email, phone),
            agent:assigned_to (full_name, email)
        `)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Calculate stats
    const stats = {
        total: allData.length,
        pending: allData.filter((r: any) => r.status === 'pending').length,
        assigned: allData.filter((r: any) => r.assigned_to).length,
        in_progress: allData.filter((r: any) => r.status === 'in_progress').length,
        completed: allData.filter((r: any) => r.status === 'completed').length,
        critical: allData.filter((r: any) => r.details?.priority === 'urgent').length
    };

    // Filter data
    let filteredData = allData;

    if (filters?.status && filters.status !== 'all') {
        filteredData = filteredData.filter((r: any) => r.status === filters.status);
    }
    if (filters?.type && filters.type !== 'all') {
        filteredData = filteredData.filter((r: any) => r.type === filters.type);
    }
    if (filters?.agentId && filters.agentId !== 'all') {
        filteredData = filteredData.filter((r: any) => r.assigned_to === filters.agentId);
    }
    if (filters?.query) {
        const q = filters.query.toLowerCase();
        filteredData = filteredData.filter((r: any) =>
            (r.request_id_display || '').toLowerCase().includes(q) ||
            r.profiles?.full_name?.toLowerCase().includes(q) ||
            r.profiles?.email?.toLowerCase().includes(q)
        );
    }

    // Map to ServiceRequest type
    const mappedRequests = filteredData.map((r: any) => ({
        id: r.id,
        requestId: r.request_id_display || (r.id || '').substring(0, 8),
        userId: r.user_id,
        customerName: r.profiles?.full_name || 'Guest',
        customerEmail: r.profiles?.email || '',
        customerContact: r.profiles?.phone || '',
        type: r.type,
        status: r.status,
        description: r.details?.description || r.details?.subject || '',
        priority: r.details?.priority || 'medium',
        requestedAt: r.created_at ? new Date(r.created_at).toLocaleDateString() + ' ' + new Date(r.created_at).toLocaleTimeString() : '',
        assignedAt: r.updated_at,
        assignedToId: r.assigned_to,
        assignedToName: r.agent?.full_name,
        notes: r.admin_notes || r.details?.admin_notes || '',
        details: r.details
    }));

    return { success: true, data: mappedRequests, stats };
}

export async function getAdminServiceRequest(id: string) {
    const supabase = await createAdminClient();

    const { data: r, error } = await supabase.from('service_requests')
        .select(`
            *,
            profiles:user_id (full_name, email, phone),
            agent:assigned_to (full_name, email)
        `)
        .eq('id', id)
        .single();

    if (error || !r) return { success: false, error: error?.message || 'Request not found' };

    const request = {
        id: r.id,
        requestId: r.request_id_display || (r.id || '').substring(0, 8),
        userId: r.user_id,
        customerName: r.profiles?.full_name || 'Guest',
        customerEmail: r.profiles?.email || '',
        customerContact: r.profiles?.phone || '',
        type: r.type,
        status: r.status,
        description: r.details?.description || r.details?.subject || '',
        priority: r.details?.priority || 'medium',
        requestedAt: r.created_at ? new Date(r.created_at).toLocaleDateString() + ' ' + new Date(r.created_at).toLocaleTimeString() : '',
        assignedAt: r.updated_at,
        assignedToId: r.assigned_to,
        assignedToName: r.agent?.full_name,
        assignedTo: r.agent ? { name: r.agent.full_name, email: r.agent.email } : undefined,
        notes: r.admin_notes || r.details?.admin_notes || '',
        details: r.details,
        completedAt: r.status === 'completed' ? r.updated_at : undefined,
        franchiseName: r.details?.franchise_name
    };

    return { success: true, data: request };
}

export async function getAgents() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('profiles')
        .select('id, full_name, email, phone')
        .in('role', ['admin', 'agent', 'employee', 'call_center_agent', 'call_centre_agent'])
        .order('full_name');

    if (error) return { success: false, error: error.message };

    const agents = data.map((p: any) => ({
        id: p.id,
        name: p.full_name || p.email,
        email: p.email,
        phone: p.phone || '',
        status: 'available' as const
    }));

    return { success: true, data: agents };
}

export async function assignServiceRequest(requestId: string, agentId: string) {
    const supabase = await createAdminClient();

    const { error } = await supabase.from('service_requests')
        .update({ assigned_to: agentId, status: 'in_progress' })
        .eq('id', requestId);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Agent assigned successfully' };
}

export async function updateServiceRequestStatus(requestId: string, status: string, notes?: string) {
    const supabase = await createAdminClient();

    const updateData: any = { status };
    if (notes) updateData.admin_notes = notes;

    const { error } = await supabase.from('service_requests')
        .update(updateData)
        .eq('id', requestId);

    if (error) return { success: false, error: error.message };

    // Send status update email
    try {
        const { data: request } = await supabase
            .from('service_requests')
            .select('user_id, request_id_display, type')
            .eq('id', requestId)
            .single();

        if (request && status === 'completed') {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', request.user_id)
                .single();

            if (profile?.email) {
                const customerName = profile.full_name || profile.email.split('@')[0];
                let htmlContent = customerServiceApprovedTemplate({
                    customerName,
                    type: request.type,
                    ticketId: request.request_id_display,
                    remarks: notes
                });

                if (request.type === 'reimbursement') {
                    htmlContent = serviceRenderedReimbursementTemplate({ customerName });
                } else if (request.type === 'diagnostic') {
                    htmlContent = serviceRenderedDiagnosticTemplate({ customerName, freeText: notes });
                } else if (request.type === 'medicine' || request.type === 'pharmacy') {
                    htmlContent = serviceRenderedMedicineTemplate({ customerName, freeText: notes });
                } else if (request.type === 'caretaker' || request.type === 'nursing') {
                    htmlContent = serviceRenderedCaretakerTemplate({ customerName });
                }

                await sendMail({
                    to: profile.email,
                    subject: `Service Request Update - ${request.request_id_display}`,
                    html: htmlContent
                });
            }
        }
    } catch (emailErr) {
        console.error('Failed to send status update email:', emailErr);
    }

    return { success: true, message: 'Status updated successfully' };
}
