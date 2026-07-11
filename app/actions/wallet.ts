'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email';
import { walletTopUpSuccessTemplate } from '@/lib/email-templates';

export async function ensureWalletExists(userId: string): Promise<{ success: boolean; wallet?: any; error?: string }> {
    const adminClient = await createAdminClient();

    const { data: existingWallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (existingWallet) {
        return { success: true, wallet: existingWallet };
    }

    const { data: newWallet, error } = await adminClient
        .from('wallets')
        .insert({
            user_id: userId,
            balance: 0,
            added_money: 0,
            currency: 'USD',
            status: 'active',
        })
        .select()
        .single();

    if (error) {
        console.error('Wallet creation error:', error);
        return { success: false, error: error.message };
    }

    return { success: true, wallet: newWallet };
}

export async function addMoneyToWallet(
    userId: string,
    amount: number,
    stripePaymentIntentId?: string
): Promise<{ success: boolean; error?: string }> {
    const adminClient = await createAdminClient();

    const walletResult = await ensureWalletExists(userId);
    if (!walletResult.success) {
        return { success: false, error: walletResult.error };
    }

    const currentBalance = Number(walletResult.wallet?.balance || 0);
    const currentAddedMoney = Number(walletResult.wallet?.added_money || 0);
    const newBalance = currentBalance + Number(amount);
    const newAddedMoney = currentAddedMoney + Number(amount);

    const { error } = await adminClient
        .from('wallets')
        .update({
            balance: newBalance,
            added_money: newAddedMoney,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    if (error) {
        console.error('Wallet update error:', error);
        return { success: false, error: error.message };
    }

    // Record transaction
    const { error: txnError } = await adminClient.from('wallet_transactions').insert({
        user_id: userId,
        type: 'credit',
        amount: Number(amount),
        description: 'Wallet top-up via Stripe',
        status: 'success',
        payment_method: 'stripe',
        stripe_payment_intent_id: stripePaymentIntentId || null,
        reference_id: stripePaymentIntentId || `TOPUP_${Date.now()}`,
        transaction_date: new Date().toISOString(),
    });

    if (txnError) {
        console.error('Transaction record error:', txnError);
        // Non-fatal — wallet was already credited
    }

    // Send confirmation email
    try {
        const { data: profile } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', userId)
            .single();

        if (profile?.email) {
            await sendMail({
                to: profile.email,
                subject: 'Wallet Top-up Successful - HealthMitra',
                html: walletTopUpSuccessTemplate({
                    customerName: profile.full_name || profile.email.split('@')[0],
                    amount: amount,
                    transactionId: stripePaymentIntentId || `WT-${Date.now()}`,
                    newBalance: newBalance,
                }),
            });
        }
    } catch (emailError) {
        console.error('Failed to send wallet top-up email:', emailError);
    }

    return { success: true };
}

export async function addReimbursementToWallet(
    userId: string,
    amount: number,
    claimId: string
): Promise<{ success: boolean; error?: string }> {
    const adminClient = await createAdminClient();

    const walletResult = await ensureWalletExists(userId);
    if (!walletResult.success) {
        return { success: false, error: walletResult.error };
    }

    const currentBalance = Number(walletResult.wallet?.balance || 0);
    // Note: We ONLY add to balance, NOT added_money. 
    // Withdrawable amount = balance - added_money, so this increases the withdrawable amount.
    const newBalance = currentBalance + Number(amount);

    const { error } = await adminClient
        .from('wallets')
        .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    if (error) {
        console.error('Wallet update error:', error);
        return { success: false, error: error.message };
    }

    // Record transaction
    const { error: txnError } = await adminClient.from('wallet_transactions').insert({
        user_id: userId,
        type: 'credit',
        amount: Number(amount),
        description: `Bill Reimbursement Approved (Claim #${claimId})`,
        status: 'success',
        reference_id: claimId,
        transaction_date: new Date().toISOString(),
    });

    if (txnError) {
        console.error('Transaction record error:', txnError);
    }

    return { success: true };
}

export async function getWalletWithTransactions(userId: string) {
    const adminClient = await createAdminClient();

    const { data: wallet, error } = await adminClient
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        return { success: false, error: error.message, wallet: null, transactions: [] };
    }

    if (!wallet) {
        return { success: true, wallet: null, transactions: [] };
    }

    const { data: transactions } = await adminClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    return { success: true, wallet, transactions: transactions || [] };
}

export async function deductFromWallet(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
): Promise<{ success: boolean; error?: string }> {
    const adminClient = await createAdminClient();

    const walletResult = await ensureWalletExists(userId);
    if (!walletResult.success) {
        return { success: false, error: walletResult.error };
    }

    const currentBalance = Number(walletResult.wallet?.balance || 0);

    if (currentBalance < amount) {
        return { success: false, error: 'Insufficient wallet balance' };
    }

    const newBalance = currentBalance - Number(amount);

    const { error } = await adminClient
        .from('wallets')
        .update({
            balance: newBalance,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    if (error) {
        console.error('Wallet deduction error:', error);
        return { success: false, error: error.message };
    }

    // Record debit transaction
    const { error: txnError } = await adminClient.from('wallet_transactions').insert({
        user_id: userId,
        type: 'debit',
        amount: Number(amount),
        description,
        status: 'success',
        reference_id: referenceId || `WD-${Date.now()}`,
        transaction_date: new Date().toISOString(),
    });

    if (txnError) {
        console.error('Debit transaction record error:', txnError);
    }

    return { success: true };
}
