import { Sidebar } from "@/components/client/Sidebar";
import { BottomNav } from "@/components/client/BottomNav";
import { DashboardHeader } from "@/components/client/DashboardHeader";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function ClientLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0];
        const { data: members } = await supabase
            .from('ecard_members')
            .select('id')
            .eq('user_id', user.id)
            .gte('valid_till', today);

        if (!members || members.length === 0) {
            redirect("/api/auth/expired-signout");
        }

        const memberIds = members.map(m => m.id);
        const { data: kycRecords } = await supabase
            .from('policy_holder_kyc')
            .select('member_id')
            .eq('kyc_submitted', true)
            .eq('admin_reset', false)
            .in('member_id', memberIds);

        const completedKycIds = new Set((kycRecords || []).map(k => k.member_id));
        const pendingKycCount = memberIds.filter(id => !completedKycIds.has(id)).length;

        const headersList = await headers();
        const pathname = headersList.get('x-pathname') || '';

        if (pendingKycCount > 0 && pathname !== '/e-cards') {
            redirect('/e-cards');
        }
    }

    // User data for header
    const userData = {
        id: user.id,
        name: profile?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatar: profile?.avatar_url
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <DashboardHeader user={userData} />

            <div className="flex pt-16 h-[calc(100vh)]">
                <Sidebar />

                <main className="flex-1 overflow-y-auto px-6 pb-24 pt-8 md:pl-80 md:pr-12 md:pt-10">
                    <div className="mx-auto max-w-6xl">
                        {children}
                    </div>
                </main>
            </div>

            <BottomNav />
        </div>
    );
}
