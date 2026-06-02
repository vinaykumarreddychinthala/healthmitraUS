import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { validatePromoCode } from '@/app/actions/coupons';

export async function POST(request: Request) {
    try {
        const { planId, amount, promoCode, guestEmail } = await request.json();

        // Get Stripe settings
        const adminClient = await createAdminClient();
        const { data: settings } = await adminClient.from('system_settings')
            .select('key, value')
            .in('key', ['stripe_enabled', 'stripe_secret_key']);

        const enabled = settings?.find(s => s.key === 'stripe_enabled')?.value === 'true' || process.env.STRIPE_ENABLED === 'true';
        const secretKey = settings?.find(s => s.key === 'stripe_secret_key')?.value || process.env.STRIPE_SECRET_KEY;

        if (!enabled || !secretKey) {
            return NextResponse.json({ success: false, error: 'Stripe not configured or enabled' }, { status: 400 });
        }

        // Validate plan and amount server-side
        const { data: plan } = await adminClient.from('plans').select('*').eq('id', planId).single();
        if (!plan) return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });

        let finalAmount = plan.price;
        if (promoCode) {
            const promoRes = await validatePromoCode(promoCode, plan.price);
            if (promoRes.success && promoRes.data) {
                finalAmount = promoRes.data.finalPrice;
            }
        }

        // Security check — log if client amount differs but don't reject (server value is authoritative)
        if (Math.abs(finalAmount - amount) > 0.01) {
            console.error('Price mismatch in Stripe payment creation:', { finalAmount, amount });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2026-04-22.dahlia',
        });

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(finalAmount * 100),
            currency: 'usd',
            receipt_email: guestEmail || undefined,
            metadata: {
                planId,
                guestEmail: guestEmail || '',
                promoCode: promoCode || '',
            },
            payment_method_types: ['card'],
        });

        return NextResponse.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error: any) {
        console.error('Stripe payment intent error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Failed to create payment' }, { status: 500 });
    }
}
