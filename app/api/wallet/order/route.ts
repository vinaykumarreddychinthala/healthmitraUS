import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { amount } = await request.json();

        if (!amount || Number(amount) < 1) {
            return NextResponse.json({ success: false, error: 'Minimum amount is $1' }, { status: 400 });
        }

        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            return NextResponse.json({ success: false, error: 'Stripe not configured' }, { status: 400 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2026-04-22.dahlia' as any,
        });

        // Get user profile for email
        const adminClient = await createAdminClient();
        const { data: profile } = await adminClient
            .from('profiles')
            .select('email, full_name')
            .eq('id', user.id)
            .single();

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(Number(amount) * 100), // cents
            currency: 'usd',
            receipt_email: profile?.email || user.email || undefined,
            metadata: {
                userId: user.id,
                type: 'wallet_topup',
                amount: String(amount),
            },
            payment_method_types: ['card'],
        });

        return NextResponse.json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        });
    } catch (error: any) {
        console.error('Wallet Stripe order error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create payment intent' },
            { status: 500 }
        );
    }
}
