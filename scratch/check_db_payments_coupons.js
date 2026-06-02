const fs = require('fs');
const path = require('path');
const https = require('https');

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const SUPABASE_URL = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function query(apiPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL,
      port: 443,
      path: apiPath,
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + SERVICE_ROLE_KEY
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log("Fetching coupons...");
  const coupons = await query('/rest/v1/coupons');
  console.log("Coupons:", JSON.stringify(coupons, null, 2));

  console.log("\nFetching franchises...");
  const franchises = await query('/rest/v1/franchises');
  console.log("Franchises:", JSON.stringify(franchises, null, 2));

  console.log("\nFetching system settings...");
  const settings = await query('/rest/v1/system_settings');
  console.log("System Settings:", JSON.stringify(settings, null, 2));

  console.log("\nFetching plans...");
  const plans = await query('/rest/v1/plans?select=id,name,price,is_active,status');
  console.log("Plans:", JSON.stringify(plans, null, 2));
}

run().catch(console.error);
