import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email';
import { validatePromoCode } from '@/app/actions/coupons';

const paymentReceiptTemplate = ({ name, planName, amount, transactionId, date }: any) => `
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
  <h2 style="color:#0891b2;border-bottom:2px solid #e2e8f0;padding-bottom:10px;">Payment Receipt</h2>
  <p>Hey <strong>${name}</strong>,</p>
  <p>Thank you for purchasing a Preventive Health Plan with HealthMitra.</p>
  <table style="width:100%;border-collapse:collapse;margin:15px 0;">
    <tr><td style="padding:8px 0;color:#64748b;">Plan</td><td style="padding:8px 0;font-weight:bold;">${planName}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;">Amount Paid</td><td style="padding:8px 0;font-weight:bold;">$${amount}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;">Transaction ID</td><td style="padding:8px 0;">${transactionId}</td></tr>
    <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;">${date}</td></tr>
  </table>
  <p>Regards,<br/><strong>HealthMitra Team</strong></p>
</div>
`;

const welcomeTemplate = ({ name, userId, password, planName, amount, transactionId }: any) => `
<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:20px;border-radius:12px;text-align:center;margin-bottom:20px;">
    <h1 style="color:white;margin:0;font-size:24px;">Welcome to HealthMitra!</h1>
  </div>
  <p>Dear <strong>${name}</strong>,</p>
  <p>Your purchase of <strong>${planName}</strong> is confirmed. Thank you for choosing HealthMitra!</p>
  <table style="width:100%;border-collapse:collapse;margin:10px 0 20px;">
    <tr><td style="padding:6px 0;color:#64748b;">Transaction ID</td><td style="padding:6px 0;">${transactionId}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Amount</td><td style="padding:6px 0;font-weight:bold;">$${amount}</td></tr>
  </table>
  <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:20px;margin:20px 0;">
    <p style="margin:0 0 8px 0;font-weight:bold;color:#16a34a;font-size:16px;">🔑 Your Login Credentials</p>
    <p style="margin:0 0 6px 0;color:#374151;">Use these to access your Customer Dashboard:</p>
    <table style="width:100%;margin-top:10px;">
      <tr>
        <td style="padding:8px;background:#fff;border-radius:6px;font-weight:bold;color:#64748b;width:100px;">User ID</td>
        <td style="padding:8px;background:#fff;border-radius:6px;font-size:18px;font-weight:bold;color:#0891b2;letter-spacing:2px;">${userId}</td>
      </tr>
      <tr><td colspan="2" style="height:6px;"></td></tr>
      <tr>
        <td style="padding:8px;background:#fff;border-radius:6px;font-weight:bold;color:#64748b;">Password</td>
        <td style="padding:8px;background:#fff;border-radius:6px;font-size:18px;font-weight:bold;color:#0891b2;letter-spacing:2px;">${password}</td>
      </tr>
    </table>
    <p style="margin:12px 0 0 0;font-size:12px;color:#6b7280;">Please save these credentials securely. You can change your password after logging in.</p>
  </div>
  <p>Visit <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://healthmitraus.com'}/login" style="color:#0891b2;">your dashboard</a> to manage your membership and download your e-card.</p>
  <p>Warm regards,<br/><strong>Team HealthMitra</strong></p>
</div>
`;

export async function POST(request: Request) {
    try {
        const adminClient = createAdminClient();
        const { name, email, phone, planId, paymentMethod, transactionId, promoCode, referralCode } = await request.json();

        if (!name || !email || !planId || !paymentMethod) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Mark any OTP verification records for this email as converted (they bought a plan)
        await adminClient
            .from('otp_verifications')
            .update({ converted: true, updated_at: new Date().toISOString() })
            .eq('email', email)
            .eq('converted', false);

        // Get plan details
        const { data: plan, error: planError } = await adminClient
            .from('plans').select('*').eq('id', planId).single();
        if (planError || !plan) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }

        // Apply promo code if present
        let finalAmount = plan.price;
        let discount = 0;
        if (promoCode) {
            const promoRes = await validatePromoCode(promoCode, plan.price);
            if (promoRes.success && promoRes.data) {
                discount = promoRes.data.discount;
                finalAmount = promoRes.data.finalPrice;
            }
        }

        // Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        let userId: string;
        let isFirstTimeUser = false;

        // Generate credentials
        const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
        const generatedUserId = `HM-${randomCode}`;
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
        let generatedPassword = '';
        for (let i = 0; i < 8; i++) {
            generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        if (existingUser) {
            userId = existingUser.id;
            // Check if they already have a membership
            const { data: existingMembers } = await adminClient
                .from('ecard_members').select('id').eq('user_id', userId).limit(1);
            isFirstTimeUser = !existingMembers || existingMembers.length === 0;

            if (isFirstTimeUser) {
                // Update their password to the generated one
                await adminClient.auth.admin.updateUserById(userId, { password: generatedPassword });
                // Update metadata
                await adminClient.auth.admin.updateUserById(userId, {
                    user_metadata: { full_name: name, phone }
                });
            }
        } else {
            // Create new user
            isFirstTimeUser = true;
            const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
                email,
                password: generatedPassword,
                email_confirm: true,
                user_metadata: { full_name: name, phone }
            });
            if (createError || !newUser?.user) {
                return NextResponse.json({ success: false, error: 'Failed to create user account' }, { status: 500 });
            }
            userId = newUser.user.id;
        }

        // Ensure profile exists
        await adminClient.from('profiles').upsert({
            id: userId,
            full_name: name,
            email,
            role: 'customer',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'id', ignoreDuplicates: false });

        // Create membership
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (plan.duration_days || 365));

        const cardId = isFirstTimeUser ? generatedUserId : `HM${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        const { data: member, error: memberError } = await adminClient
            .from('ecard_members')
            .insert({
                user_id: userId,
                plan_id: planId,
                full_name: name,
                relation: 'Self',
                status: 'active',
                valid_from: startDate.toISOString().split('T')[0],
                valid_till: expiryDate.toISOString().split('T')[0],
                coverage_amount: plan.coverage_amount || plan.price * 100,
                card_unique_id: cardId,
            })
            .select().single();

        if (memberError) {
            return NextResponse.json({ success: false, error: 'Failed to create membership: ' + memberError.message }, { status: 500 });
        }

        // -----------------------------------------------------------------------
        // Insert into `customers` table (plan buyer record)
        // -----------------------------------------------------------------------
        const finalTransactionId = transactionId || `TEST_${Date.now()}`;
        await adminClient.from('customers').insert({
            user_id: userId,
            email,
            full_name: name,
            phone: phone || null,
            plan_id: planId,
            plan_name: plan.name,
            card_unique_id: cardId,
            amount_paid: finalAmount,
            currency: 'USD',
            payment_method: paymentMethod,
            transaction_id: finalTransactionId,
            valid_from: startDate.toISOString().split('T')[0],
            valid_till: expiryDate.toISOString().split('T')[0],
            status: 'active',
        });

        // Link the `users` table entry to their newly-created auth account
        await adminClient
            .from('users')
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq('email', email);

        // Create payment record
        await adminClient.from('payments').insert({
            user_id: userId,
            plan_id: planId,
            amount: finalAmount,
            currency: 'USD',
            status: 'captured',
            razorpay_order_id: `order_${Date.now()}_${userId.slice(0, 8)}`,
            razorpay_payment_id: finalTransactionId,
            payment_method: paymentMethod,
            purpose: 'plan_purchase',
            metadata: { promo_code: promoCode, discount, referral_code: referralCode || null }
        });

        // Create invoice
        await adminClient.from('invoices').insert({
            user_id: userId,
            plan_id: planId,
            invoice_number: `INV-${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            plan_name: plan.name,
            amount: finalAmount,
            gst: 0,
            total: finalAmount,
            payment_method: paymentMethod,
            transaction_id: finalTransactionId,
            status: 'paid',
        });

        // Send emails
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        await sendMail({
            to: email,
            subject: `Payment Receipt — ${plan.name}`,
            html: paymentReceiptTemplate({ name, planName: plan.name, amount: finalAmount, transactionId: finalTransactionId, date: today })
        });

        if (isFirstTimeUser) {
            await sendMail({
                to: email,
                subject: `Welcome to HealthMitra — Your Login Credentials`,
                html: welcomeTemplate({ name, userId: generatedUserId, password: generatedPassword, planName: plan.name, amount: finalAmount, transactionId: finalTransactionId })
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                membershipId: member.id,
                planName: plan.name,
                amount: finalAmount,
                startDate: startDate.toISOString(),
                expiryDate: expiryDate.toISOString(),
                transactionId: finalTransactionId,
                isFirstTimeUser,
            }
        });
    } catch (error: any) {
        console.error('Guest purchase error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Purchase failed' }, { status: 500 });
    }
}
