import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { addMoneyToWallet } from '@/app/actions/wallet';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { paymentIntentId, amount } = await request.json();

        if (!paymentIntentId || !amount) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            return NextResponse.json({ success: false, error: 'Stripe not configured' }, { status: 400 });
        }

        const stripe = new Stripe(secretKey, {
            apiVersion: '2026-04-22.dahlia' as any,
        });

        // Server-side verification — confirm payment intent succeeded
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json(
                { success: false, error: `Payment not confirmed. Status: ${paymentIntent.status}` },
                { status: 400 }
            );
        }

        // Verify this payment intent belongs to this user
        if (paymentIntent.metadata?.userId !== user.id) {
            return NextResponse.json({ success: false, error: 'Payment intent mismatch' }, { status: 403 });
        }

        // Verify amount matches (prevent tampering)
        const expectedAmountCents = Math.round(Number(amount) * 100);
        if (paymentIntent.amount !== expectedAmountCents) {
            return NextResponse.json({ success: false, error: 'Amount mismatch' }, { status: 400 });
        }

        // Credit wallet
        const result = await addMoneyToWallet(user.id, Number(amount), paymentIntentId);

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Wallet Stripe confirm error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to confirm payment' },
            { status: 500 }
        );
    }
}
