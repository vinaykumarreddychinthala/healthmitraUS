import { NextResponse } from 'next/server';
import crypto from 'crypto';

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

export async function POST(request: Request) {
    try {
        if (!KEY_SECRET) {
            return NextResponse.json(
                { success: false, error: 'Razorpay credentials not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json(
                { success: false, error: 'Missing required payment fields' },
                { status: 400 }
            );
        }

        // HMAC-SHA256 signature verification per Razorpay docs
        const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac('sha256', KEY_SECRET)
            .update(payload)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return NextResponse.json(
                { success: false, error: 'Payment signature verification failed' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id,
                message: 'Payment verified successfully',
            },
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Verification failed';
        console.error('[Razorpay verify-payment]', error);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
