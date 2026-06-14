'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WithdrawalRequest, WithdrawalStatus } from '@/types/wallet';
import { sendMail } from '@/lib/email';
import { 
    ewalletRedemptionToCustomerTemplate, 
    ewalletRedemptionToAdminTemplate,
    ewalletRefundNotInitiatedActionTemplate,
    ewalletRefundInitiatedTemplate
} from '@/lib/email-templates';

export async function getWithdrawals(): Promise<{ success: boolean; data?: WithdrawalRequest[]; error?: string }> {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    const mappedData: WithdrawalRequest[] = (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        customerName: row.customer_name || '',
        customerEmail: row.customer_email || '',
        amount: row.amount,
        status: row.status as WithdrawalStatus,
        bankName: row.bank_name || '',
        bankAccount: row.bank_account || '',
        ifscCode: row.ifsc_code || '',
        createdAt: row.created_at,
        processedAt: row.processed_at,
        adminNotes: row.admin_notes
    }));

    return { success: true, data: mappedData };
}

export async function processWithdrawal(
    id: string,
    action: 'approve' | 'reject' | 'complete',
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    // Check authorization - only admins can process withdrawals
    const regularClient = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await regularClient.auth.getUser();
    
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }
    
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        return { success: false, error: 'Only admins can process withdrawals' };
    }
    
    let newStatus: WithdrawalStatus;
    switch (action) {
        case 'approve':
            newStatus = 'approved';
            break;
        case 'reject':
            newStatus = 'rejected';
            break;
        case 'complete':
            newStatus = 'completed';
            break;
        default:
            return { success: false, error: 'Invalid action' };
    }

    const updates: any = {
        status: newStatus,
        admin_notes: notes || null,
        processed_at: new Date().toISOString()
    };

    const { error } = await adminClient
        .from('withdrawal_requests')
        .update(updates)
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    // Send email to customer
    try {
        const { data: request } = await adminClient
            .from('withdrawal_requests')
            .select('customer_name, customer_email, amount')
            .eq('id', id)
            .single();

        if (request && request.customer_email) {
            if (action === 'approve') {
                await sendMail({
                    to: request.customer_email,
                    subject: 'E-Wallet Redemption Approved - HealthMitra',
                    html: ewalletRedemptionToCustomerTemplate({
                        customerName: request.customer_name,
                        amount: request.amount,
                        transactionId: notes || 'Processed'
                    })
                });
            } else if (action === 'complete') {
                await sendMail({
                    to: request.customer_email,
                    subject: 'E-Wallet Refund Initiated - HealthMitra',
                    html: ewalletRefundInitiatedTemplate({
                        amount: request.amount,
                        utrNo: notes || 'N/A',
                        date: new Date().toLocaleDateString()
                    })
                });
            } else if (action === 'reject') {
                await sendMail({
                    to: request.customer_email,
                    subject: 'E-Wallet Redemption Update - HealthMitra',
                    html: ewalletRefundNotInitiatedActionTemplate({
                        customerName: request.customer_name,
                        amount: request.amount
                    })
                });
            }
        }
    } catch (emailError) {
        console.error('Failed to send withdrawal email:', emailError);
    }

    return { success: true };
}

export async function createWithdrawalRequest(
    userId: string,
    customerName: string,
    customerEmail: string,
    amount: number,
    bankName: string,
    bankAccount: string,
    ifscCode: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
            user_id: userId,
            customer_name: customerName,
            customer_email: customerEmail,
            amount,
            bank_name: bankName,
            bank_account: bankAccount,
            ifsc_code: ifscCode,
            status: 'pending'
        });

    if (error) {
        return { success: false, error: error.message };
    }

    // Send notification to admin
    try {
        await sendMail({
            to: process.env.ADMIN_EMAIL || 'service@healthmitraus.com',
            subject: 'New E-Wallet Redemption Request',
            html: ewalletRedemptionToAdminTemplate({
                customerName,
                amount,
                requestId: 'Pending'
            })
        });
    } catch (emailError) {
        console.error('Failed to send admin notification for withdrawal:', emailError);
    }

    return { success: true };
}
