'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WithdrawalRequest, WithdrawalStatus } from '@/types/wallet';
import { sendMail } from '@/lib/email';
import { deductFromWallet } from '@/app/actions/wallet';
import {
    ewalletRedemptionToCustomerTemplate,
    ewalletRedemptionToAdminTemplate,
    ewalletRefundNotInitiatedActionTemplate,
    ewalletRefundInitiatedTemplate,
} from '@/lib/email-templates';

export async function getWithdrawals(): Promise<{ success: boolean; data?: WithdrawalRequest[]; error?: string }> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .not('user_id', 'is', null) // Only customer wallet withdrawals (not franchise partner withdrawals)
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
        adminNotes: row.admin_notes,
    }));

    return { success: true, data: mappedData };
}

export async function getUserWithdrawals(userId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const adminClient = await createAdminClient();

    const { data, error } = await adminClient
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
}

export async function processWithdrawal(
    id: string,
    action: 'approve' | 'reject' | 'complete',
    notes?: string
): Promise<{ success: boolean; error?: string }> {
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
        case 'approve': newStatus = 'approved'; break;
        case 'reject': newStatus = 'rejected'; break;
        case 'complete': newStatus = 'completed'; break;
        default: return { success: false, error: 'Invalid action' };
    }

    // Get withdrawal details before updating
    const { data: request } = await adminClient
        .from('withdrawal_requests')
        .select('*')
        .eq('id', id)
        .single();

    if (!request) {
        return { success: false, error: 'Withdrawal request not found' };
    }

    // If completing, deduct from the user's wallet
    if (action === 'complete' && request.user_id) {
        const deductResult = await deductFromWallet(
            request.user_id,
            Number(request.amount),
            `Withdrawal to bank account (****${(request.bank_account || '').slice(-4)})`,
            `WR-${id}`
        );

        if (!deductResult.success) {
            return { success: false, error: `Failed to deduct wallet: ${deductResult.error}` };
        }
    }

    const { error } = await adminClient
        .from('withdrawal_requests')
        .update({
            status: newStatus,
            admin_notes: notes || null,
            processed_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        return { success: false, error: error.message };
    }

    // Send email to customer
    try {
        if (request && request.customer_email) {
            if (action === 'approve') {
                await sendMail({
                    to: request.customer_email,
                    subject: 'E-Wallet Redemption Approved - HealthMitra',
                    html: ewalletRedemptionToCustomerTemplate({
                        customerName: request.customer_name,
                        amount: request.amount,
                        transactionId: notes || 'Approved',
                    }),
                });
            } else if (action === 'complete') {
                await sendMail({
                    to: request.customer_email,
                    subject: 'E-Wallet Refund Initiated - HealthMitra',
                    html: ewalletRefundInitiatedTemplate({
                        amount: request.amount,
                        utrNo: notes || 'N/A',
                        date: new Date().toLocaleDateString(),
                    }),
                });
            } else if (action === 'reject') {
                await sendMail({
                    to: request.customer_email,
                    subject: 'E-Wallet Redemption Update - HealthMitra',
                    html: ewalletRefundNotInitiatedActionTemplate({
                        customerName: request.customer_name,
                        amount: request.amount,
                    }),
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
    ifscCode: string,
    billType?: string,
    billNumber?: string,
    billDate?: string
): Promise<{ success: boolean; error?: string }> {
    // Use admin client to bypass RLS for withdrawal creation
    const adminClient = await createAdminClient();

    const { error } = await adminClient
        .from('withdrawal_requests')
        .insert({
            user_id: userId,
            customer_name: customerName,
            customer_email: customerEmail,
            amount,
            bank_name: bankName,
            bank_account: bankAccount,
            ifsc_code: ifscCode,
            bill_type: billType || null,
            bill_number: billNumber || null,
            bill_date: billDate || null,
            status: 'pending',
        });

    if (error) {
        return { success: false, error: error.message };
    }

    // Notify admin
    try {
        await sendMail({
            to: process.env.ADMIN_EMAIL || 'service@healthmitraus.com',
            subject: 'New E-Wallet Redemption Request',
            html: ewalletRedemptionToAdminTemplate({
                customerName,
                amount,
                requestId: 'Pending',
            }),
        });
    } catch (emailError) {
        console.error('Failed to send admin notification for withdrawal:', emailError);
    }

    return { success: true };
}
