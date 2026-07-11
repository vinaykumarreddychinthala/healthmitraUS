'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ReimbursementClaim, ClaimStatus } from '@/types/reimbursements';
import { sendMail } from '@/lib/email';
import { 
    billReimbursementOpdTemplate, 
    billReimbursementTestTemplate,
    billReimbursementMedicineTemplate,
    billReimbursementVaccinationTemplate,
    billRejectedTemplate,
    billUploadTimelineTemplate,
    adminBillUploadedTemplate
} from '@/lib/email-templates';
import { addReimbursementToWallet } from '@/app/actions/wallet';

export async function getClaims() {
    const supabase = await createAdminClient();

    // Join with profiles if possible, or just fetch
    const { data, error } = await supabase.from('reimbursement_claims').select(`
        *,
        user:user_id(full_name)
    `).order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const claims: ReimbursementClaim[] = data.map((c: any) => ({
        id: c.id,
        claimId: c.claim_id_display || `CLM-${(c.id || '').substring(0, 8).toUpperCase()}`,
        status: (c.status as ClaimStatus) || 'pending',
        customerId: c.user_id,
        customerName: c.user?.full_name || 'Unknown User',
        planName: c.plan_name || 'Standard Plan',
        title: c.title || 'Reimbursement Claim',
        amount: c.amount_requested || c.amount || 0,
        approvedAmount: c.amount_approved,
        billDate: c.bill_date,
        providerName: c.provider_name || 'Unknown Provider',
        submittedAt: c.created_at,
        documents: c.documents || [],
        adminNotes: c.admin_notes,
        customerComments: c.customer_comments
    }));

    return { success: true, data: claims };
}

export async function processClaim(id: string, status: ClaimStatus, data: { amount?: number; notes?: string }) {
    const supabase = await createAdminClient();
    const updates: any = {
        status,
        updated_at: new Date().toISOString()
    };

    if (status === 'approved' && data.amount !== undefined) {
        updates.amount_approved = data.amount;
    }

    if (data.notes) {
        updates.admin_notes = data.notes;
        if (status === 'rejected') updates.rejection_reason = data.notes;
    }

    const { error } = await supabase.from('reimbursement_claims').update(updates).eq('id', id);

    if (error) return { success: false, error: error.message };

    // Send notification email and update wallet if approved
    try {
        const { data: claim } = await supabase
            .from('reimbursement_claims')
            .select('user_id, title')
            .eq('id', id)
            .single();
            
        if (claim) {
            // Update wallet if approved
            if (status === 'approved' && data.amount !== undefined && data.amount > 0) {
                await addReimbursementToWallet(claim.user_id, data.amount, id);
            }
            
            const { data: profile } = await supabase
                .from('profiles')
                .select('email, full_name')
                .eq('id', claim.user_id)
                .single();
                
            if (profile?.email) {
                if (status === 'approved') {
                    const titleLowerCase = (claim.title || '').toLowerCase();
                    let emailHtml = '';
                    const templateProps = {
                        customerName: profile.full_name || profile.email.split('@')[0],
                        amount: data.amount || 0,
                        percentage: '100', // Default or calculated
                        taxAmount: '0' // Default or calculated
                    };

                    if (titleLowerCase.includes('test') || titleLowerCase.includes('diagnostic')) {
                        emailHtml = billReimbursementTestTemplate(templateProps);
                    } else if (titleLowerCase.includes('medicine') || titleLowerCase.includes('pharmacy')) {
                        emailHtml = billReimbursementMedicineTemplate(templateProps);
                    } else if (titleLowerCase.includes('vaccination') || titleLowerCase.includes('vaccine')) {
                        emailHtml = billReimbursementVaccinationTemplate(templateProps);
                    } else {
                        emailHtml = billReimbursementOpdTemplate(templateProps);
                    }

                    await sendMail({
                        to: profile.email,
                        subject: `Reimbursement Approved - HealthMitra`,
                        html: emailHtml
                    });
                } else if (status === 'rejected') {
                    await sendMail({
                        to: profile.email,
                        subject: `Reimbursement Claim Update - HealthMitra`,
                        html: billRejectedTemplate({
                            customerName: profile.full_name || profile.email.split('@')[0],
                            remarks: data.notes || 'No remarks provided.'
                        })
                    });
                }
            }
        }
    } catch (emailErr) {
        console.error('Failed to send claim status email:', emailErr);
    }

    return { success: true, message: `Claim ${status} successfully` };
}

export async function submitClaim(claimData: any) {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('reimbursement_claims')
        .insert({
            user_id: user.id,
            plan_id: claimData.plan_id || null,
            plan_name: claimData.plan_name || 'Health Plan',
            title: `Reimbursement for ${claimData.patient_name} - ${claimData.diagnosis}`,
            provider_name: claimData.hospital_name,
            bill_date: claimData.treatment_date,
            amount: claimData.amount,
            amount_requested: claimData.amount,
            status: 'pending',
            customer_comments: claimData.diagnosis,
            documents: claimData.documents || [],
        })
        .select()
        .single();

    if (error) return { success: false, error: error.message };

    try {
        // Send email to customer
        const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).single();
        if (profile?.email) {
            const customerName = profile.full_name || profile.email.split('@')[0];
            await sendMail({
                to: profile.email,
                subject: `Bill Reimbursement Request Received - HealthMitra`,
                html: billUploadTimelineTemplate({ customerName })
            });

            // Send email to Admin
            await sendMail({
                to: process.env.ADMIN_EMAIL || 'admin@healthmitraus.com',
                subject: `New Bill Uploaded by ${customerName}`,
                html: adminBillUploadedTemplate({
                    adminName: 'Admin',
                    customerName: customerName,
                    ticketId: data.claim_id_display || data.id,
                    type: 'Reimbursement'
                })
            });
        }
    } catch (emailErr) {
        console.error('Failed to send claim notification emails:', emailErr);
    }

    return { success: true, data };
}
