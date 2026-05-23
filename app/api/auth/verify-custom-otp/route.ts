import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { email, otp, hash, name, phone, planId } = await request.json();

        if (!email || !otp || !hash) {
            return NextResponse.json({ success: false, error: 'Email, OTP, and hash are required' }, { status: 400 });
        }

        // Verify the OTP using HMAC — stateless, no database needed for verification
        const secret = process.env.JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'default-secret';
        const calculatedHash = crypto.createHmac('sha256', secret).update(`${email}:${otp}`).digest('hex');

        if (calculatedHash !== hash) {
            return NextResponse.json({ success: false, error: 'Invalid or expired OTP' }, { status: 400 });
        }

        // OTP is valid — track this verification in the database
        // This runs asynchronously and won't block the response
        trackOTPVerification({ email, name, phone, planId }).catch(err =>
            console.error('OTP tracking error (non-critical):', err)
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to verify OTP' }, { status: 500 });
    }
}

async function trackOTPVerification({ email, name, phone, planId }: {
    email: string; name?: string; phone?: string; planId?: string;
}) {
    const adminClient = createAdminClient();

    // Fetch plan name if planId is provided
    let planName: string | null = null;
    if (planId) {
        const { data: plan } = await adminClient.from('plans').select('name').eq('id', planId).single();
        planName = plan?.name || null;
    }

    const now = new Date().toISOString();
    const logEntry = { verified_at: now, plan_id: planId || null, plan_name: planName };

    // -----------------------------------------------------------------------
    // 1. Upsert into `users` table — every verified person gets a row here.
    //    user_id stays NULL until they purchase a plan (auth account created then).
    // -----------------------------------------------------------------------
    await adminClient.from('users').upsert({
        email,
        name: name || null,
        phone: phone || null,
        interested_plan_id: planId || null,
        source: 'otp_verify',
        verified_at: now,
        updated_at: now,
    }, { onConflict: 'email', ignoreDuplicates: false });

    // -----------------------------------------------------------------------
    // 2. Track in otp_verifications (existing analytics / admin visibility)
    // -----------------------------------------------------------------------
    const { data: existing } = await adminClient
        .from('otp_verifications')
        .select('id, verify_count, verify_log, converted')
        .eq('email', email)
        .eq('plan_id', planId || null)
        .maybeSingle();

    if (existing) {
        // Already converted to customer — don't track anymore
        if (existing.converted) return;

        await adminClient.from('otp_verifications').update({
            name: name || undefined,
            phone: phone || undefined,
            verify_count: (existing.verify_count || 0) + 1,
            last_seen_at: now,
            verify_log: [...(existing.verify_log || []), logEntry],
            updated_at: now,
        }).eq('id', existing.id);
    } else {
        await adminClient.from('otp_verifications').insert({
            email,
            name: name || null,
            phone: phone || null,
            plan_id: planId || null,
            plan_name: planName,
            verify_count: 1,
            first_seen_at: now,
            last_seen_at: now,
            verify_log: [logEntry],
            converted: false,
        });
    }
}
