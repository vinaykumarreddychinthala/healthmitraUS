'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Razorpay from 'razorpay';

interface PlanPurchaseData {
    planId: string;
    paymentMethod: 'razorpay' | 'paypal' | 'stripe' | 'test';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
}

export async function getRazorpaySettings() {
    const supabase = await createClient();
    const { data: settings } = await supabase.from('system_settings')
        .select('key, value')
        .in('key', ['razorpay_enabled', 'razorpay_key_id', 'razorpay_key_secret']);

    return {
        enabled: settings?.find(s => s.key === 'razorpay_enabled')?.value === 'true',
        keyId: settings?.find(s => s.key === 'razorpay_key_id')?.value || '',
        keySecret: settings?.find(s => s.key === 'razorpay_key_secret')?.value || '',
    };
}

export async function createRazorpayOrderForPlan(planId: string, amount: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'User not authenticated' };

    const settings = await getRazorpaySettings();
    if (!settings.enabled || !settings.keyId || !settings.keySecret) {
        return { success: false, error: 'Razorpay is not configured' };
    }

    try {
        const razorpay = new Razorpay({
            key_id: settings.keyId,
            key_secret: settings.keySecret,
        });

        const options = {
            amount: Math.round(amount * 100),
            currency: 'USD',
            receipt: `hm_${planId}_${Date.now()}`,
            notes: {
                planId,
                userId: user.id,
            },
        };

        const order = await razorpay.orders.create(options);

        return {
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: settings.keyId,
            }
        };
    } catch (error: any) {
        console.error('Razorpay order creation error:', error);
        return { success: false, error: error.message || 'Failed to create payment order' };
    }
}

export async function purchasePlan(data: PlanPurchaseData) {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, error: 'User not authenticated' };
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', data.planId)
        .single();

    if (planError || !plan) {
        return { success: false, error: 'Plan not found' };
    }

    // Get Razorpay settings
    const settings = await getRazorpaySettings();

    // If Razorpay is enabled and payment method is razorpay, verify payment
    let paymentStatus = 'completed';
    let transactionId = `TEST_${Date.now()}`;

    if (settings.enabled && data.paymentMethod === 'razorpay') {
        // In production, you'd verify the payment here
        paymentStatus = 'completed';
        transactionId = data.razorpayPaymentId || `RAZORPAY_${Date.now()}`;
    } else if (data.paymentMethod === 'paypal' || data.paymentMethod === 'stripe') {
        paymentStatus = 'completed';
        transactionId = data.razorpayPaymentId || `${data.paymentMethod.toUpperCase()}_${Date.now()}`;
    } else {
        // Test mode - no real payment
        paymentStatus = 'completed';
        transactionId = `TEST_${Date.now()}`;
    }

    // Calculate expiry date (exactly plan duration, default 365 days)
    const startDate = new Date();
    const expiryDate = new Date();
    const planDurationDays = plan.duration_days || 365;
    expiryDate.setDate(expiryDate.getDate() + Math.max(0, planDurationDays - 1));

    // Ensure profile exists — use admin client to bypass RLS
    try {
        await adminClient.from('profiles').upsert({
            id: user.id,
            full_name: user.email?.split('@')[0] || 'User',
            email: user.email,
            role: 'customer',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: true });
    } catch (err) {
        console.error('Profile upsert error:', err);
    }

    // Create purchase record in ecard_members — use admin client
    // Use date-only format (YYYY-MM-DD) for valid_from and valid_till
    const { data: member, error: memberError } = await adminClient
        .from('ecard_members')
        .insert({
            user_id: user.id,
            plan_id: data.planId,
            full_name: user.email?.split('@')[0] || 'User',
            relation: 'Self',
            status: 'active',
            valid_from: startDate.toISOString().split('T')[0],
            valid_till: expiryDate.toISOString().split('T')[0],
            coverage_amount: plan.coverage_amount || plan.price * 100,
            card_unique_id: `HM${Date.now()}${crypto.randomUUID().replace(/-/g,'').slice(0,9).toUpperCase()}`,
        })
        .select()
        .single();

    if (memberError) {
        console.error('Member creation error:', memberError);
        return { success: false, error: 'Failed to create membership: ' + memberError.message };
    }

    // Create payment record — use admin client
    // Note: razorpay_order_id has UNIQUE constraint, so we generate a unique value
    const orderId = data.razorpayOrderId || `manual_${Date.now()}_${(user.id || 'unknown').slice(0, 8)}`;
    await adminClient.from('payments').insert({
        user_id: user.id,
        plan_id: data.planId,
        amount: plan.price,
        currency: 'USD',
        status: paymentStatus,
        razorpay_order_id: orderId,
        razorpay_payment_id: transactionId,
        payment_method: data.paymentMethod,
        purpose: 'plan_purchase',
    });

    // Create invoice record for the purchase (non-critical, don't fail if this fails)
    try {
        const invoiceNumber = `INV-${new Date().getFullYear()}-${member.id?.slice(-8).toUpperCase() || Date.now().toString(36).toUpperCase()}`;
        
        let baseAmount = plan.price;
        let gstAmount = 0;
        if (data.paymentMethod === 'razorpay') {
            baseAmount = Number((plan.price / 1.18).toFixed(2));
            gstAmount = Number((plan.price - baseAmount).toFixed(2));
        }

        await adminClient.from('invoices').insert({
            user_id: user.id,
            plan_id: data.planId,
            plan_name: plan.name,
            invoice_number: invoiceNumber,
            amount: baseAmount,
            gst: gstAmount,
            total: plan.price,
            status: 'paid',
            payment_method: data.paymentMethod,
            transaction_id: transactionId,
        });
    } catch (invoiceErr: any) {
        console.error('Invoice creation error (non-critical):', invoiceErr.message);
    }

    return {
        success: true,
        data: {
            membershipId: member.id,
            planName: plan.name,
            amount: plan.price,
            startDate: startDate.toISOString(),
            expiryDate: expiryDate.toISOString(),
            transactionId,
        }
    };
}

export async function getPlanById(planId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (error || !data) return { success: false, error: 'Plan not found' };
    return { success: true, data };
}
