import { WalletView } from "@/components/client/wallet/WalletView";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWalletWithTransactions } from "@/app/actions/wallet";

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Use server action to bypass RLS
    const { wallet, transactions } = await getWalletWithTransactions(user.id);

    const txs: any[] = transactions || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const stats = {
        totalCredited: txs.filter((t: any) => t.type === 'credit').reduce((a: number, t: any) => a + Number(t.amount), 0),
        creditedCount: txs.filter((t: any) => t.type === 'credit').length,
        totalDebited: txs.filter((t: any) => t.type === 'debit').reduce((a: number, t: any) => a + Number(t.amount), 0),
        debitedCount: txs.filter((t: any) => t.type === 'debit').length,
        thisMonthSpend: txs.filter((t: any) => t.type === 'debit' && t.created_at >= startOfMonth).reduce((a: number, t: any) => a + Number(t.amount), 0),
        thisMonthCount: txs.filter((t: any) => t.type === 'debit' && t.created_at >= startOfMonth).length
    };

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();

    // Check KYC Status for withdrawal eligibility
    const today = new Date().toISOString().split('T')[0];
    const { data: members } = await supabase
        .from('ecard_members')
        .select('id')
        .eq('user_id', user.id)
        .gte('valid_till', today);

    let canWithdraw = false;
    if (members && members.length > 0) {
        const memberIds = members.map(m => m.id);
        const { data: kycRecords } = await supabase
            .from('policy_holder_kyc')
            .select('member_id, admin_verified')
            .eq('kyc_submitted', true)
            .eq('admin_reset', false)
            .in('member_id', memberIds);

        const verifiedCount = (kycRecords || []).filter((k: any) => k.admin_verified).length;
        // All members must have completed and verified KYC to withdraw
        if (verifiedCount === members.length) {
            canWithdraw = true;
        }
    }

    return <WalletView 
        wallet={wallet || { id: '', balance: 0, currency: 'USD', status: 'inactive' }} 
        stats={stats} 
        userName={profile?.full_name || ''}
        canWithdraw={canWithdraw}
    />;
}
