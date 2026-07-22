import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const KEY_ID = process.env.RAZORPAY_KEY_ID!;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!;

export async function POST(request: Request) {
    try {
        if (!KEY_ID || !KEY_SECRET) {
            return NextResponse.json(
                { success: false, error: 'Razorpay credentials not configured' },
                { status: 500 }
            );
        }

        const body = await request.json();
        const { amount, currency = 'INR', receipt, notes } = body;

        // amount must be in smallest currency unit (paise for INR, cents for USD)
        if (!amount || typeof amount !== 'number' || amount < 100) {
            return NextResponse.json(
                { success: false, error: 'Amount must be at least 100 paise (₹1)' },
                { status: 400 }
            );
        }

        const razorpay = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });

        // Razorpay enforces max 40 chars on receipt
        const safeReceipt = (receipt || `hm_${Date.now()}`).slice(0, 40);

        const order = await razorpay.orders.create({
            amount: Math.round(amount),
            currency,
            receipt: safeReceipt,
            notes: notes || {},
        });

        return NextResponse.json({
            success: true,
            data: {
                order_id: order.id,
                amount: order.amount,
                currency: order.currency,
                key_id: KEY_ID,
            },
        });
    } catch (error: unknown) {
        console.error('[Razorpay create-order]', JSON.stringify(error));
        // Razorpay SDK throws objects, not Error instances — extract description
        const rzpError = error as { error?: { description?: string }; message?: string };
        const msg = rzpError?.error?.description || rzpError?.message || 'Failed to create Razorpay order';
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
