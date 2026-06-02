import { Sidebar } from "@/components/client/Sidebar";
import { BottomNav } from "@/components/client/BottomNav";
import { DashboardHeader } from "@/components/client/DashboardHeader";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function ClientLayout({
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
        .select('*')
        .eq('id', user.id)
        .single();

    const isAdmin = profile?.role === 'admin';

    if (!isAdmin) {
        const today = new Date().toISOString().split('T')[0];

        // Fetch all active members for this user just to check expiration
        const { data: members } = await adminClient
            .from('ecard_members')
            .select('id')
            .eq('user_id', user.id)
            .gte('valid_till', today);

        if (!members || members.length === 0) {
            redirect("/api/auth/expired-signout");
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
