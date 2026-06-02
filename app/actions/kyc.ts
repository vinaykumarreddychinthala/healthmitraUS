'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';

// ─── Customer: Submit an edit request ───────────────────────────────────────

export async function submitKYCEditRequest(memberId: string, reason: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };
    if (!reason?.trim()) return { success: false, error: 'Reason is required' };

    // Verify member belongs to this user
    const { data: member } = await adminClient
        .from('ecard_members')
        .select('id, user_id')
        .eq('id', memberId)
        .eq('user_id', user.id)
        .single();

    if (!member) return { success: false, error: 'Member not found or unauthorized' };

    // Check for existing pending request
    const { data: existing } = await adminClient
        .from('kyc_edit_requests')
        .select('id, status')
        .eq('member_id', memberId)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

    if (existing) {
        return { success: false, error: 'You already have a pending edit request for this member.' };
    }

    const { error } = await adminClient.from('kyc_edit_requests').insert({
        user_id: user.id,
        member_id: memberId,
        reason: reason.trim(),
        status: 'pending',
    });

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Edit request submitted. Admin will review it shortly.' };
}

// ─── Customer: Get my edit requests ─────────────────────────────────────────

export async function getMyKYCEditRequests() {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated', data: [] };

    const { data, error } = await adminClient
        .from('kyc_edit_requests')
        .select('*, ecard_members(full_name, relation)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message, data: [] };

    return {
        success: true,
        data: (data || []).map((r: any) => ({
            id: r.id,
            memberId: r.member_id,
            memberName: r.ecard_members?.full_name || 'Unknown',
            relation: r.ecard_members?.relation || '',
            reason: r.reason,
            status: r.status as 'pending' | 'approved' | 'rejected',
            adminNote: r.admin_note,
            createdAt: r.created_at,
            resolvedAt: r.resolved_at,
        })),
    };
}

// ─── Customer: Get KYC status for all their members ─────────────────────────

export async function getKYCStatusForAllMembers() {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated', data: [] };

    const today = new Date().toISOString().split('T')[0];

    // Get all active members
    const { data: members, error: membersErr } = await adminClient
        .from('ecard_members')
        .select('id, full_name, relation, plan_id')
        .eq('user_id', user.id)
        .gte('valid_till', today);

    if (membersErr || !members) return { success: false, error: membersErr?.message, data: [] };

    if (members.length === 0) return { success: true, data: [], allComplete: true };

    const memberIds = members.map((m: any) => m.id);

    // Get KYC records for those members
    const { data: kycRecords } = await adminClient
        .from('policy_holder_kyc')
        .select('member_id, kyc_submitted, admin_reset')
        .in('member_id', memberIds);

    const kycMap = new Map<string, boolean>();
    for (const k of (kycRecords || [])) {
        kycMap.set(k.member_id, k.kyc_submitted && !k.admin_reset);
    }

    const result = members.map((m: any) => ({
        memberId: m.id,
        memberName: m.full_name,
        relation: m.relation,
        planId: m.plan_id,
        kycSubmitted: kycMap.get(m.id) ?? false,
    }));

    const allComplete = result.every(r => r.kycSubmitted);

    return { success: true, data: result, allComplete };
}
