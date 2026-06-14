import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import ClientAccessGuard from "@/components/client/ClientAccessGuard";

export default async function ClientTemplate({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0];

        // Fetch all active members for this user
        const { data: members } = await adminClient
            .from('ecard_members')
            .select('id')
            .eq('user_id', user.id)
            .gte('valid_till', today);

        if (!members || members.length === 0) {
            redirect("/api/auth/expired-signout");
        }

        const memberIds = members.map(m => m.id);

        // Check how many members have completed KYC and how many are verified
        const { data: kycRecords } = await adminClient
            .from('policy_holder_kyc')
            .select('member_id, admin_verified')
            .eq('kyc_submitted', true)
            .eq('admin_reset', false)
            .in('member_id', memberIds);

        const completedKycIds = new Set((kycRecords || []).map((k: any) => k.member_id));
        const verifiedCount = (kycRecords || []).filter((k: any) => k.admin_verified).length;
        const pendingKycCount = memberIds.filter(id => !completedKycIds.has(id)).length;

        // Get the current path from headers (set by middleware)
        const headersList = await headers();
        const pathname = headersList.get('x-pathname') || '';

        // Note: Global KYC redirects have been removed. 
        // Users can navigate the dashboard, but specific actions (like Wallet Withdrawal) 
        // are blocked locally in their respective components if KYC is pending.
    }

    return (
        <ClientAccessGuard>
            {children}
        </ClientAccessGuard>
    );
}
