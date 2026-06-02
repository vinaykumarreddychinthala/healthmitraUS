require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log("Seeding test coupons...");
  const coupons = [
    { code: 'WELCOME50', discount_type: 'percentage', discount_value: 50, is_active: true },
    { code: 'FLAT20', discount_type: 'fixed', discount_value: 20, is_active: true }
  ];

  for (const c of coupons) {
    const { error } = await supabase.from('coupons').upsert(c, { onConflict: 'code' });
    if (error) {
      console.error(`Error inserting coupon ${c.code}:`, error.message);
    } else {
      console.log(`Upserted coupon ${c.code}`);
    }
  }

  console.log("\nSeeding test franchises (partners)...");
  const franchises = [
    {
      franchise_name: 'Test Partner Franchise',
      code: 'PARTNER10',
      status: 'active',
      verification_status: 'verified',
      kyc_status: 'verified'
    }
  ];

  for (const f of franchises) {
    const { error } = await supabase.from('franchises').upsert(f, { onConflict: 'code' });
    if (error) {
      console.error(`Error inserting franchise ${f.code}:`, error.message);
    } else {
      console.log(`Upserted franchise ${f.code}`);
    }
  }

  console.log("\nSeeding system settings for payments & referrals...");
  const settings = [
    { key: 'stripe_enabled', value: 'true', description: 'Enable Stripe payment gateway' },
    { key: 'stripe_publishable_key', value: process.env.STRIPE_PUBLISHABLE_KEY || '', description: 'Stripe Publishable Key' },
    { key: 'stripe_secret_key', value: process.env.STRIPE_SECRET_KEY || '', description: 'Stripe Secret Key', is_secure: true },
    { key: 'referral_discount', value: '15', description: 'Referral discount percentage' },
    { key: 'razorpay_enabled', value: 'false', description: 'Enable Razorpay' },
    { key: 'paypal_enabled', value: 'false', description: 'Enable PayPal' }
  ];

  for (const s of settings) {
    const { error } = await supabase.from('system_settings').upsert(s, { onConflict: 'key' });
    if (error) {
      console.error(`Error inserting setting ${s.key}:`, error.message);
    } else {
      console.log(`Upserted setting ${s.key}`);
    }
  }

  console.log("\nSeeding completed successfully!");
}

run().catch(console.error);
