import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: plans, error } = await supabaseAdmin
    .from('plans')
    .select('id, name, allowed_services')
    .ilike('name', '%elder%');

  if (error) {
    console.error("Error fetching plans:", error);
    return;
  }

  console.log("Found plans:", plans);

  for (const plan of plans) {
    if (plan.allowed_services && plan.allowed_services.includes('ambulance')) {
      const updatedServices = plan.allowed_services.filter((s: string) => s !== 'ambulance');
      const { error: updateError } = await supabaseAdmin
        .from('plans')
        .update({ allowed_services: updatedServices })
        .eq('id', plan.id);
      
      if (updateError) {
        console.error("Error updating plan", plan.id, updateError);
      } else {
        console.log(`Removed ambulance from plan: ${plan.name}`);
      }
    }
  }
}

main();
