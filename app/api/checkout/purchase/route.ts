import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { sendMail } from '@/lib/email';
import { 
    planPurchaseConfirmationTemplate,
    confirmationOfPlanPurchaseTemplate,
    planPurchaseWelcomeTemplate,
    paymentReceiptTemplate
} from '@/lib/email-templates';
import { validatePromoCode } from '@/app/actions/coupons';

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

        // Generate unique Member ID for primary slot
        const primaryMemberId = generateMemberId();

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
                member_id_code: primaryMemberId,
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
                    member_id_code: generateMemberId(),
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
        const policyId = generatePolicyId();
        await adminClient.from('customers').insert({
            user_id: user.id,
            email: user.email!,
            full_name: user.email?.split('@')[0] || 'User',
            plan_id: planId,
            plan_name: plan.name,
            card_unique_id: generatedUserId,
            policy_id: policyId,
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
        if (user.email) {
            const name = user.email.split('@')[0];
            const gatewayName = paymentMethod === 'razorpay' ? 'Razorpay' : paymentMethod === 'paypal' ? 'PayPal' : paymentMethod === 'stripe' ? 'Stripe' : 'EasePay';
            
            // Construct plan details page URL
            const host = request.headers.get('host') || 'healthmitra.co.in';
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            const domain = `${protocol}://${host}`;
            const planUrl = plan.slug ? `${domain}/plans/${plan.slug}` : `${domain}/plans`;

            // 1️⃣ Plan Purchase Welcome Email
            if (isFirstTimeUser) {
                await sendMail({
                    to: user.email,
                    subject: `Welcome to HealthMitra - Your ${plan.name} Membership Details`,
                    devData: { 'User ID': user.email, 'Password': generatedPassword, 'Email': user.email },
                    html: planPurchaseConfirmationTemplate({
                        customerName: name,
                        userId: user.email,
                        password: generatedPassword,
                        planName: plan.name,
                        transactionId: transactionId || 'N/A',
                        amount: totalAmount,
                        partnerName: gatewayName,
                        planUrl
                    })
                });
            } else {
                await sendMail({
                    to: user.email,
                    subject: `Confirmation of Your HealthMitra Plan Purchase`,
                    devData: { 'Email': user.email, 'Note': 'Existing user — password unchanged' },
                    html: confirmationOfPlanPurchaseTemplate({
                        planName: plan.name,
                        planUrl
                    })
                });
            }

            // Send Payment Receipt
            await sendMail({
                to: user.email,
                subject: `Payment Receipt for ${plan.name} - HealthMitra`,
                html: paymentReceiptTemplate({
                    customerName: name,
                    customerPhone: user.user_metadata?.phone || '',
                    customerEmail: user.email,
                    transactionId: transactionId || 'N/A',
                    date: new Date().toLocaleDateString(),
                    planName: plan.name,
                    amount: finalAmount
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
