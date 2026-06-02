import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ kycSubmitted: false, verifiedCount: 0 });

        const today = new Date().toISOString().split('T')[0];

        // Fetch all active/pending members for this user
        const { data: members } = await adminClient
            .from('ecard_members')
            .select('id')
            .eq('user_id', user.id)
            .gte('valid_till', today);

        if (!members || members.length === 0) {
            return NextResponse.json({ kycSubmitted: true, verifiedCount: 0 });
        }

        const memberIds = members.map(m => m.id);

        const { data: kycRecords } = await adminClient
            .from('policy_holder_kyc')
            .select('member_id, admin_verified')
            .eq('kyc_submitted', true)
            .eq('admin_reset', false)
            .in('member_id', memberIds);

        const completedKycIds = new Set((kycRecords || []).map((k: any) => k.member_id));
        const verifiedCount = (kycRecords || []).filter((k: any) => k.admin_verified).length;
        const pendingKycCount = memberIds.filter(id => !completedKycIds.has(id)).length;

        // kycSubmitted is true ONLY if ALL members have completed KYC
        return NextResponse.json({ 
            kycSubmitted: pendingKycCount === 0,
            verifiedCount 
        });
    } catch (error: any) {
        return NextResponse.json({ kycSubmitted: false, verifiedCount: 0 });
    }
}
