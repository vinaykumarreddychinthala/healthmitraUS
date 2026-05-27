import { createClient } from "@/lib/supabase/client";

export async function createClaim(claimData: any) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Unauthorized") };

  const { data, error } = await supabase
    .from('reimbursement_claims')
    .insert({
      user_id: user.id,
      plan_id: claimData.plan_id || null,
      plan_name: claimData.plan_name || 'Health Plan',
      title: `Reimbursement for ${claimData.patient_name} - ${claimData.diagnosis}`,
      provider_name: claimData.hospital_name,
      bill_date: claimData.treatment_date,
      amount: claimData.amount,
      amount_requested: claimData.amount,
      status: 'pending',
      customer_comments: claimData.diagnosis,
      documents: claimData.documents || [],
    })
    .select()
    .single();

  return { data, error };
}
