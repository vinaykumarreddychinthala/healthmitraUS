import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email';
import { validatePromoCode } from '@/app/actions/coupons';


const paymentReceiptTemplate = ({
  name,
  planName,
  amount,
  transactionId,
  date
}: any) => `
<div style="font-family:sans-serif;max-width:600px;margin:auto;">
  <h2 style="color:#0891b2;">Payment Receipt</h2>
  <p>Hey ${name},</p>
  <p>Thank you for purchasing your Preventive Health Plan.</p>

  <p><strong>Plan:</strong> ${planName}</p>
  <p><strong>Amount Paid:</strong> $${amount}</p>
  <p><strong>Transaction ID:</strong> ${transactionId}</p>
  <p><strong>Date:</strong> ${date}</p>

  <br/>
  <p>Regards,<br/><strong>HealthMitra Team</strong></p>
</div>
`;


const welcomeTemplate = ({
  name,
  email,
  userId,
  password,
  planName,
  amount,
  transactionId
}: any) => `
<div style="font-family:sans-serif;max-width:600px;margin:auto;">
  <p>Dear ${name},</p>

  <p>Thank you for choosing <strong>HealthMitra</strong>.</p>

  <p>You have successfully purchased <strong>${planName}</strong>.</p>

  <p><strong>Transaction ID:</strong> ${transactionId}</p>
  <p><strong>Amount:</strong> $${amount}</p>

  <p>Your login details to access the Customer Panel:</p>
  <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 10px 0;">
    <p style="margin: 0 0 10px 0;"><strong>User ID:</strong> ${userId || email}</p>
    <p style="margin: 0;"><strong>Password:</strong> ${password || '(Use your existing password)'}</p>
  </div>

  <p>Please download your temporary e-card from your dashboard.</p>

  <p>If you need help, contact us at support.</p>

  <br/>
  <p>Warm regards,<br/><strong>Team HealthMitra</strong></p>
</div>
`;

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const adminClient = await createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { planId, paymentMethod, razorpayOrderId, razorpayPaymentId, promoCode } = await request.json();

        // Validate required fields
        if (!planId) {
            return NextResponse.json({ success: false, error: 'Plan ID is required' }, { status: 400 });
        }

        if (!paymentMethod || !['razorpay', 'paypal', 'stripe', 'test'].includes(paymentMethod)) {
            return NextResponse.json({ success: false, error: 'Invalid payment method' }, { status: 400 });
        }

        // Get plan details
        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', planId)
            .single();

        if (planError || !plan) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }

        // Get Razorpay settings
        const { data: settings } = await adminClient.from('system_settings')
            .select('key, value')
            .in('key', ['razorpay_enabled']);

        const razorpayEnabled = settings?.find(s => s.key === 'razorpay_enabled')?.value === 'true';

        // Apply promo code if present
        let discount = 0;
        let finalAmount = plan.price;
        if (promoCode) {
            const promoRes = await validatePromoCode(promoCode, plan.price);
            if (promoRes.success && promoRes.data) {
                discount = promoRes.data.discount;
                finalAmount = promoRes.data.finalPrice;
            }
        }

        // Determine transaction ID and status
        let transactionId: string;
        let status: string;
        let isTestMode = false;

        if (paymentMethod === 'razorpay') {
            if (!razorpayEnabled) {
                return NextResponse.json({ success: false, error: 'Razorpay payment is not enabled' }, { status: 400 });
            }
            // Real payment via Razorpay - validate payment ID exists
            if (!razorpayPaymentId) {
                return NextResponse.json({ success: false, error: 'Razorpay payment ID is required' }, { status: 400 });
            }
            transactionId = razorpayPaymentId;
            status = 'captured';
        } else if (paymentMethod === 'paypal') {
            // PayPal - validate order ID exists
            if (!razorpayOrderId) {
                return NextResponse.json({ success: false, error: 'PayPal order ID is required' }, { status: 400 });
            }
            transactionId = razorpayPaymentId || razorpayOrderId;
            status = 'captured';
        } else if (paymentMethod === 'stripe') {
            // Stripe - validate payment ID exists
            if (!razorpayPaymentId) {
                return NextResponse.json({ success: false, error: 'Stripe payment ID is required' }, { status: 400 });
            }
            transactionId = razorpayPaymentId;
            status = 'captured';
        } else {
            // Test payment - only allowed in test mode (should be disabled in production)
            isTestMode = true;
            transactionId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
            status = 'captured';
        }

        // Calculate dates
        const startDate = new Date();
        const expiryDate = new Date();
        const planDurationDays = plan.duration_days || 365;
        expiryDate.setDate(expiryDate.getDate() + planDurationDays);

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

        // Check if first time user (no existing memberships)
        const { data: existingMembers } = await adminClient
            .from('ecard_members')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
        
        const isFirstTimeUser = !existingMembers || existingMembers.length === 0;

        let generatedUserId = '';
        let generatedPassword = '';
        
        if (isFirstTimeUser) {
            // Generate HM-XXXXXX
            const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
            generatedUserId = `HM-${randomCode}`;
            
            // Generate 8 char password
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
            for (let i = 0; i < 8; i++) {
                generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
            }

            // Update user's password in Supabase Auth
            await adminClient.auth.admin.updateUserById(user.id, { password: generatedPassword });
        } else {
            // For existing users, just generate a standard card ID, they already have a password
            generatedUserId = `HM${Date.now()}${crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase()}`;
        }

        // Create membership record — use admin client to bypass RLS
        const { data: member, error: memberError } = await adminClient
            .from('ecard_members')
            .insert({
                user_id: user.id,
                plan_id: planId,
                full_name: '',
                relation: 'Self',
                status: 'pending',
                valid_from: startDate.toISOString().split('T')[0],
                valid_till: expiryDate.toISOString().split('T')[0],
                coverage_amount: plan.coverage_amount || plan.price * 100,
                card_unique_id: generatedUserId,
            })
            .select()
            .single();

        if (memberError) {
            console.error('Member creation error:', memberError);
            return NextResponse.json({ success: false, error: 'Failed to create membership: ' + memberError.message }, { status: 500 });
        }

        // Auto-populate family members if multi-member plan
        const maxMembers = plan.member_count_max || 1;
        if (maxMembers > 1) {
            const familyMembersToInsert = [];
            for (let i = 1; i < maxMembers; i++) {
                const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
                const familyCardId = `HM-${randomCode}`;
                familyMembersToInsert.push({
                    user_id: user.id,
                    plan_id: planId,
                    full_name: '',
                    relation: `Family Member ${i}`,
                    status: 'pending',
                    valid_from: startDate.toISOString().split('T')[0],
                    valid_till: expiryDate.toISOString().split('T')[0],
                    coverage_amount: plan.coverage_amount || plan.price * 100,
                    card_unique_id: familyCardId,
                });
            }
            const { error: familyError } = await adminClient.from('ecard_members').insert(familyMembersToInsert);
            if (familyError) {
                console.error('Family members pre-population error:', familyError);
            }
        }

        // -----------------------------------------------------------------------
        // Insert into `customers` table (plan buyer record)
        // -----------------------------------------------------------------------
        await adminClient.from('customers').insert({
            user_id: user.id,
            email: user.email!,
            full_name: user.email?.split('@')[0] || 'User',
            plan_id: planId,
            plan_name: plan.name,
            card_unique_id: generatedUserId,
            amount_paid: finalAmount,
            currency: 'USD',
            payment_method: paymentMethod,
            transaction_id: transactionId,
            valid_from: startDate.toISOString().split('T')[0],
            valid_till: expiryDate.toISOString().split('T')[0],
            status: 'active',
        });

        // Mark any OTP verification records for this email as converted (they bought a plan)
        if (user.email) {
            await adminClient
                .from('otp_verifications')
                .update({ converted: true, updated_at: new Date().toISOString() })
                .eq('email', user.email)
                .eq('converted', false);
        }

        // Ensure the `users` table has this person linked to their auth account
        // (they may have verified via OTP before, or this could be their first entry)
        await adminClient.from('users').upsert({
            email: user.email!,
            user_id: user.id,
            source: 'checkout',
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'email', ignoreDuplicates: false });

        // Create payment record — use admin client

        // Generate unique order ID to avoid UNIQUE constraint violation
        const orderId = razorpayOrderId || `manual_${Date.now()}_${user.id.slice(0, 8)}`;
        await adminClient.from('payments').insert({
            user_id: user.id,
            plan_id: planId,
            amount: finalAmount,
            currency: 'USD',
            status,
            razorpay_order_id: orderId,
            razorpay_payment_id: transactionId,
            payment_method: paymentMethod || 'test',
            purpose: 'plan_purchase',
            metadata: { promo_code: promoCode, discount: discount }
        });

        // Create invoice record — use admin client
        const gstAmount = 0;
        const totalAmount = finalAmount;
        
        const { error: invoiceError } = await adminClient.from('invoices').insert({
            user_id: user.id,
            plan_id: planId,
            invoice_number: `INV-${Date.now()}${crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase()}`,
            plan_name: plan.name,
            amount: finalAmount,
            gst: gstAmount,
            total: finalAmount,
            payment_method: paymentMethod || 'test',
            transaction_id: transactionId,
            status: 'paid',
        });

        if (invoiceError) {
            console.error('Invoice creation error:', invoiceError);
        }

        // Send confirmation email
        // if (user.email) {
        //     await sendMail({
        //         to: user.email,
        //         subject: `Payment Successful - Welcome to ${plan.name}`,
        //         html: `
        //             <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        //                 <h2 style="color: #0891b2;">Payment Successful!</h2>
        //                 <p>Hi ${user.email.split('@')[0]},</p>
        //                 <p>Thank you for purchasing the <strong>${plan.name}</strong> plan.</p>
        //                 <p>Your membership is now active from <strong>${startDate.toLocaleDateString()}</strong> to <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
        //                 <p>Total amount paid: $${totalAmount}</p>
        //                 <br/>
        //                 <p>Thank you,</p>
        //                 <p><strong>HealthMitra Team</strong></p>
        //             </div>
        //         `
        //     });
        // }

        if (user.email) {
    const name = user.email.split('@')[0];

    // 1️⃣ Payment Receipt
    await sendMail({
        to: user.email,
        subject: `Payment Receipt - ${plan.name}`,
        html: paymentReceiptTemplate({
            name,
            planName: plan.name,
            amount: totalAmount,
            transactionId,
            date: new Date().toLocaleDateString()
        })
    });

    // 2️⃣ Welcome Email
    await sendMail({
        to: user.email,
        subject: `Welcome to ${plan.name} - HealthMitra`,
        devData: isFirstTimeUser
            ? { 'User ID': generatedUserId, 'Password': generatedPassword, 'Email': user.email }
            : { 'Email': user.email, 'Note': 'Existing user — password unchanged' },
        html: welcomeTemplate({
            name,
            email: user.email,
            userId: isFirstTimeUser ? generatedUserId : null,
            password: isFirstTimeUser ? generatedPassword : null,
            planName: plan.name,
            amount: totalAmount,
            transactionId
        })
    });
}

        return NextResponse.json({
            success: true,
            data: {
                membershipId: member.id,
                planName: plan.name,
                amount: plan.price,
                startDate: startDate.toISOString(),
                expiryDate: expiryDate.toISOString(),
                transactionId,
                isTestMode,
                isFirstTimeUser,
            }
        });
    } catch (error: any) {
        console.error('Purchase error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Purchase failed' }, { status: 500 });
    }
}
