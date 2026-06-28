import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const email = 'vinayreddy.28c@gmail.com'; 
  const { data: profiles } = await supabase.from('profiles').select('*');
  let user = profiles?.find((p: any) => p.full_name?.toLowerCase().includes('vinay')) || profiles?.[0];
  
  if (!user) {
    console.log("No user found.");
    return;
  }

  const { data: members } = await supabase.from('ecard_members').select('*, plans(*)').eq('user_id', user.id);
  console.log("Ecard Members:");
  members?.forEach((m: any) => console.log(`ID: ${m.id}, Rel: ${m.relation}, Status: ${m.status}, Plan: ${m.plans?.name}, Card: ${m.card_unique_id}, Group: ${m.group_id || 'N/A'}`));
  
  const { data: customers } = await supabase.from('customers').select('*').eq('user_id', user.id);
  console.log("\nCustomers:");
  customers?.forEach((c: any) => console.log(`ID: ${c.id}, PlanID: ${c.plan_id}, Name: ${c.plan_name}, Status: ${c.status}`));
}

check().catch(console.error);
