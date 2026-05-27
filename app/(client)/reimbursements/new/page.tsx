import ClaimForm from "@/components/client/reimbursements/ClaimForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewReimbursementPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: members } = await supabase
        .from('ecard_members')
        .select('*, policy_holder_kyc(admin_verified)')
        .eq('user_id', user.id);

    return (
        <div className="space-y-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">New Reimbursement</h1>
                <p className="text-slate-500">Submit a new insurance claim for your recent treatments</p>
            </div>
            <ClaimForm userProfile={profile || { id: user.id }} policyMembers={members || []} />
        </div>
    );
}
