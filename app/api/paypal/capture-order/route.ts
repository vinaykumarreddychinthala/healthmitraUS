import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { validatePromoCode } from '@/app/actions/coupons';
import { sendMail } from '@/lib/email';
import crypto from 'crypto';

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

async function getPayPalAccessToken(clientId: string, clientSecret: string, sandbox: boolean) {
    const base = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const res = await fetch(`${base}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || 'Failed to get PayPal token');
    return { accessToken: data.access_token, base };
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const adminClient = await createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { paypalOrderId, planId, promoCode } = await request.json();

        const { data: settings } = await adminClient.from('system_settings')
            .select('key, value')
            .in('key', ['paypal_client_id', 'paypal_client_secret', 'paypal_sandbox']);

        const clientId = settings?.find(s => s.key === 'paypal_client_id')?.value;
        const clientSecret = settings?.find(s => s.key === 'paypal_client_secret')?.value;
        const sandbox = settings?.find(s => s.key === 'paypal_sandbox')?.value !== 'false';

        if (!clientId || !clientSecret) {
            return NextResponse.json({ success: false, error: 'PayPal not configured' }, { status: 400 });
        }

        const { accessToken, base } = await getPayPalAccessToken(clientId, clientSecret, sandbox);

        // Capture the order
        const captureRes = await fetch(`${base}/v2/checkout/orders/${paypalOrderId}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
        });

        const captureData = await captureRes.json();
        if (!captureRes.ok || captureData.status !== 'COMPLETED') {
            throw new Error(captureData.message || 'PayPal capture failed');
        }

        const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

        // Get plan details
        const { data: plan, error: planError } = await supabase
            .from('plans').select('*').eq('id', planId).single();
        if (planError || !plan) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }

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
        } catch (_) {}

        // Create membership — use admin client
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + (plan.duration_days || 365));

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
                console.error('PayPal checkout family members pre-population error:', familyError);
            }
        }

        // Create payment record — use admin client
        await adminClient.from('payments').insert({
            user_id: user.id,
            plan_id: planId,
            amount: finalAmount,
            currency: 'USD',
            status: 'captured',
            razorpay_order_id: null,
            razorpay_payment_id: captureId || paypalOrderId,
            payment_method: 'paypal',
            metadata: { promo_code: promoCode, discount: discount }
        });

        // Create invoice — use admin client
        const gstAmount = 0;
        await adminClient.from('invoices').insert({
            user_id: user.id,
            plan_id: planId,
            invoice_number: `INV-${Date.now()}${crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase()}`,
            plan_name: plan.name,
            amount: finalAmount,
            gst: gstAmount,
            total: finalAmount,
            payment_method: 'paypal',
            transaction_id: captureId || paypalOrderId,
            status: 'paid',
        });

        if (user.email) {
            const name = user.email.split('@')[0];
            
            // 1️⃣ Payment Receipt
            await sendMail({
                to: user.email,
                subject: `Payment Receipt - ${plan.name}`,
                html: paymentReceiptTemplate({
                    name,
                    planName: plan.name,
                    amount: finalAmount,
                    transactionId: captureId || paypalOrderId,
                    date: new Date().toLocaleDateString()
                })
            });

            // 2️⃣ Welcome Email
            await sendMail({
                to: user.email,
                subject: `Welcome to ${plan.name} - HealthMitra`,
                html: welcomeTemplate({
                    name,
                    email: user.email,
                    userId: isFirstTimeUser ? generatedUserId : null,
                    password: isFirstTimeUser ? generatedPassword : null,
                    planName: plan.name,
                    amount: finalAmount,
                    transactionId: captureId || paypalOrderId
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
                transactionId: captureId || paypalOrderId,
                isFirstTimeUser,
            },
        });
    } catch (error: any) {
        console.error('PayPal capture error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Payment capture failed' }, { status: 500 });
    }
}
