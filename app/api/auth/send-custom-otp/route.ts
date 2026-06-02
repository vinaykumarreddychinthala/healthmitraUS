import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/email';
import crypto from 'crypto';
import { verifyTurnstileToken } from '@/lib/turnstile';

export async function POST(request: Request) {
    try {
        const { name, email, phone, turnstileToken } = await request.json();

        if (!name || !email || !phone) {
            return NextResponse.json({ success: false, error: 'Name, email, and phone are required' }, { status: 400 });
        }

        // Verify CAPTCHA
        if (!turnstileToken) {
            return NextResponse.json({ success: false, error: 'Security verification failed. Please try again.' }, { status: 400 });
        }

        const isTurnstileValid = await verifyTurnstileToken(turnstileToken);
        if (!isTurnstileValid) {
            return NextResponse.json({ success: false, error: 'Security verification failed. Please refresh the page.' }, { status: 400 });
        }


        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Create a hash to verify later without storing in the database
        const secret = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret';
        const dataToHash = `${email}:${otp}`;
        const hash = crypto.createHmac('sha256', secret).update(dataToHash).digest('hex');

        if (process.env.NODE_ENV !== 'production') {
            console.log('\n================================================================');
            console.log(`🔑 DEV MODE OTP TRIGGERED FOR: ${email}`);
            console.log(`🔑 OTP CODE: ${otp}`);
            console.log('================================================================\n');
        }

        // Send the OTP via email
        const emailResult = await sendMail({
            to: email,
            subject: 'Your HealthMitra OTP Code',
            devData: { 'OTP': otp, 'For': email },
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
                    <h2 style="color: #0891b2; text-align: center;">Verify Your Email</h2>
                    <p>Hi ${name},</p>
                    <p>Thank you for choosing HealthMitra. To continue with your purchase, please use the following One-Time Password (OTP):</p>
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #0f172a;">${otp}</span>
                    </div>
                    <p>This code is valid for a short period. Please do not share it with anyone.</p>
                    <br/>
                    <p>Warm regards,<br/><strong>HealthMitra Team</strong></p>
                </div>
            `
        });

        if (!emailResult.success) {
            return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
        }

        // Return the hash so the client can send it back for verification
        return NextResponse.json({ success: true, hash });
    } catch (error: any) {
        console.error('Send OTP Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate OTP' }, { status: 500 });
    }
}
