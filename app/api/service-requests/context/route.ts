import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/service-requests/context
 *
 * Returns the current user's active plans, each with the KYC-submitted
 * policy holders linked to that plan. Used by the Plan/PolicyHolder selector
 * wizard before a service request form is filled.
 *
 * Response shape:
 * {
 *   success: true,
 *   plans: [
 *     {
 *       memberId: string,          -- ecard_members.id
 *       planId: string,
 *       planName: string,
 *       cardUniqueId: string,      -- HM-XXXXXX
 *       validTill: string,
 *       allowedServices: string[],
 *       policyHolders: [
 *         {
 *           kycId: string,
 *           holderFullName: string,
 *           relation: string,
 *           photoUrl: string | null,
 *           memberId: string,
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const today = new Date().toISOString().split('T')[0];

        // Fetch all active ecard_members for this user, joined with plan info
        const { data: members, error: memberError } = await adminClient
            .from('ecard_members')
            .select(`
                id,
                plan_id,
                card_unique_id,
                valid_from,
                valid_till,
                status,
                plans (
                    id,
                    name,
                    allowed_services
                )
            `)
            .eq('user_id', user.id)
            .eq('status', 'active');

        if (memberError) {
            return NextResponse.json({ success: false, error: memberError.message }, { status: 500 });
        }

        if (!members || members.length === 0) {
            return NextResponse.json({ success: true, plans: [] });
        }

        // For each member (plan), fetch its KYC-submitted policy holders
        const memberIds = members.map(m => m.id);

        const { data: kycRecords } = await adminClient
            .from('policy_holder_kyc')
            .select('id, member_id, holder_full_name, relation, photo_url')
            .in('member_id', memberIds)
            .eq('kyc_submitted', true)
            .eq('admin_reset', false);

        // Group KYC records by member_id
        const kycByMemberId: Record<string, any[]> = {};
        for (const kyc of kycRecords || []) {
            if (!kycByMemberId[kyc.member_id]) kycByMemberId[kyc.member_id] = [];
            kycByMemberId[kyc.member_id].push({
                kycId: kyc.id,
                holderFullName: kyc.holder_full_name,
                relation: kyc.relation,
                photoUrl: kyc.photo_url || null,
                memberId: kyc.member_id,
            });
        }

        // Build response — one entry per ecard_member (plan purchase)
        const plans = members.map(m => {
            const plan = m.plans as any;
            return {
                memberId: m.id,
                planId: m.plan_id,
                planName: plan?.name || 'Health Plan',
                cardUniqueId: m.card_unique_id || `HM-${m.id.substring(0, 8).toUpperCase()}`,
                validTill: m.valid_till || '',
                allowedServices: plan?.allowed_services || [],
                policyHolders: kycByMemberId[m.id] || [],
            };
        });

        return NextResponse.json({ success: true, plans });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
