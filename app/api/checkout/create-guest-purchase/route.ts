import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email';
import { 
    planPurchaseConfirmationTemplate,
    confirmationOfPlanPurchaseTemplate,
    paymentReceiptTemplate,
    planRepurchaseConfirmationTemplate,
    planPurchaseWelcomeTemplate
} from '@/lib/email-templates';
import { validatePromoCode } from '@/app/actions/coupons';
import { sendPlanPurchaseWhatsApp } from '@/lib/whatsapp';

/** Generate a unique Member ID: MEM-XXXXX (5 random digits) */
function generateMemberId(): string {
    const digits = Math.floor(10000 + Math.random() * 90000); // always 5 digits
    return `MEM-${digits}`;
}

/** Generate a unique Policy ID: POL-XXXXXXX (7 random digits) */
function generatePolicyId(): string {
    const digits = Math.floor(1000000 + Math.random() * 9000000); // always 7 digits
    return `POL-${digits}`;
}

export async function POST(request: Request) {
    try {
        const adminClient = createAdminClient();
        const { name, email, phone, planId, paymentMethod, transactionId, promoCode, referralCode, amount, currency } = await request.json();

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

        // Use the amount sent from the frontend which includes live exchange rate and GST
        // Fallback to USD base price if amount wasn't sent
        let finalAmount = amount !== undefined ? amount : plan.price;
        let finalCurrency = currency || 'USD';
        let discount = 0;
        
        if (promoCode) {
            const promoRes = await validatePromoCode(promoCode, plan.price);
            if (promoRes.success && promoRes.data) {
                discount = promoRes.data.discount;
                // Don't override finalAmount here if amount was passed from frontend
                if (amount === undefined) finalAmount = promoRes.data.finalPrice;
            }
        }

        // Check if user already exists (using profiles table instead of listUsers which is limited to 50)
        const { data: existingProfile } = await adminClient
            .from('profiles')
            .select('id, email')
            .eq('email', email)
            .single();

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

        if (existingProfile) {
            userId = existingProfile.id;
            // Check if they have any active membership (not expired)
            const today = new Date().toISOString().split('T')[0];
            const { data: activeMembers } = await adminClient
                .from('ecard_members')
                .select('id')
                .eq('user_id', userId)
                .gte('valid_till', today)
                .limit(1);
            
            // If they have no active plans, they must receive new credentials via email
            isFirstTimeUser = !activeMembers || activeMembers.length === 0;

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
                console.error('Auth creation error:', createError);
                return NextResponse.json({ success: false, error: 'Failed to create user account: ' + (createError?.message || 'Unknown error') }, { status: 500 });
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
        const planDurationDays = plan.duration_days || 365;
        expiryDate.setDate(expiryDate.getDate() + Math.max(0, planDurationDays - 1));

        const cardId = isFirstTimeUser ? generatedUserId : `HM${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const policyId = generatePolicyId();

        const { data: member, error: memberError } = await adminClient
            .from('ecard_members')
            .insert({
                user_id: userId,
                plan_id: planId,
                full_name: '',
                relation: 'Self',
                status: 'pending',
                valid_from: startDate.toISOString().split('T')[0],
                valid_till: expiryDate.toISOString().split('T')[0],
                coverage_amount: plan.coverage_amount || plan.price * 100,
                card_unique_id: cardId,
                member_id_code: generateMemberId(),
            })
            .select().single();

        if (memberError) {
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
                    user_id: userId,
                    plan_id: planId,
                    full_name: '',
                    relation: `Family Member ${i}`,
                    status: 'pending',
                    valid_from: startDate.toISOString().split('T')[0],
                    valid_till: expiryDate.toISOString().split('T')[0],
                    coverage_amount: plan.coverage_amount || plan.price * 100,
                    card_unique_id: familyCardId,
                    member_id_code: generateMemberId(),
                });
            }
            const { error: familyError } = await adminClient.from('ecard_members').insert(familyMembersToInsert);
            if (familyError) {
                console.error('Guest checkout family members pre-population error:', familyError);
            }
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
            policy_id: policyId,
            amount_paid: finalAmount,
            currency: finalCurrency,
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
            currency: finalCurrency,
            status: 'captured',
            razorpay_order_id: `order_${Date.now()}_${userId.slice(0, 8)}`,
            razorpay_payment_id: finalTransactionId,
            payment_method: paymentMethod,
            purpose: 'plan_purchase',
            metadata: { promo_code: promoCode, discount, referral_code: referralCode || null }
        });

        // Create invoice
        let baseAmount = finalAmount;
        let gstAmount = 0;
        if (paymentMethod === 'razorpay') {
            baseAmount = Number((finalAmount / 1.18).toFixed(2));
            gstAmount = Number((finalAmount - baseAmount).toFixed(2));
        }

        await adminClient.from('invoices').insert({
            user_id: userId,
            plan_id: planId,
            invoice_number: `INV-${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            plan_name: plan.name,
            amount: baseAmount,
            gst: gstAmount,
            total: finalAmount,
            payment_method: paymentMethod,
            transaction_id: finalTransactionId,
            status: 'paid',
        });

        // Send emails
        if (email) {
            const gatewayName = paymentMethod === 'razorpay' ? 'Razorpay' : paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'stripe' ? 'Stripe' : 'EasePay';
            
            // Construct plan details page URL
            const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://healthmitraus.com';
            const planUrl = plan.slug ? `${domain}/plans/${plan.slug}` : `${domain}/plans`;

            await sendMail({
                to: email,
                subject: `Welcome to HealthMitra - Your ${plan.name} Membership Details`,
                devData: { 'User ID': email, 'Password': isFirstTimeUser ? generatedPassword : 'unchanged', 'Email': email },
                html: planPurchaseWelcomeTemplate({
                    customerName: name,
                    userId: email,
                    password: isFirstTimeUser ? generatedPassword : '',
                    planName: plan.name,
                    transactionId: finalTransactionId || 'N/A',
                    amount: finalAmount,
                    currency: finalCurrency,
                    planUrl
                })
            });

            // Send WhatsApp confirmation (non-blocking — failure won't affect purchase)
            if (phone) {
                const domain = process.env.NEXT_PUBLIC_APP_URL || 'https://healthmitraus.com';
                const planUrl = plan.slug ? `${domain}/plans/${plan.slug}` : `${domain}/plans`;
                sendPlanPurchaseWhatsApp({
                    name,
                    phone,
                    email,
                    planUrl,
                }).then(result => {
                    if (!result.success) {
                        console.warn('[WhatsApp] Plan purchase notification failed:', result.error);
                    }
                }).catch(err => {
                    console.error('[WhatsApp] Unexpected error sending plan purchase message:', err);
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                membershipId: member.id,
                planName: plan.name,
                amount: finalAmount,
                currency: finalCurrency,
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
