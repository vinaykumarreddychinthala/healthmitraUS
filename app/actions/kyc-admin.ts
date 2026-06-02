'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';

// ─── Admin: Get all KYC edit requests (paginated + filtered) ─────────────────

export async function getKYCEditRequests(filters?: {
    status?: string;
    query?: string;
    page?: number;
    limit?: number;
}) {
    const adminClient = createAdminClient();

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = adminClient
        .from('kyc_edit_requests')
        .select(`
            *,
            ecard_members(full_name, relation, card_unique_id),
            profiles!kyc_edit_requests_user_id_fkey(full_name, email, phone)
        `, { count: 'exact' });

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message, data: [], totalCount: 0 };

    return {
        success: true,
        totalCount: count || 0,
        data: (data || []).map((r: any) => ({
            id: r.id,
            userId: r.user_id,
            memberId: r.member_id,
            memberName: r.ecard_members?.full_name || 'Unknown',
            memberRelation: r.ecard_members?.relation || '',
            cardId: r.ecard_members?.card_unique_id || '',
            customerName: r.profiles?.full_name || 'Unknown',
            customerEmail: r.profiles?.email || '',
            customerPhone: r.profiles?.phone || '',
            reason: r.reason,
            status: r.status as 'pending' | 'approved' | 'rejected',
            adminNote: r.admin_note,
            resolvedBy: r.resolved_by,
            resolvedAt: r.resolved_at,
            createdAt: r.created_at,
        })),
    };
}

// ─── Admin: Get pending count (for sidebar badge) ────────────────────────────

export async function getPendingKYCRequestsCount() {
    const adminClient = createAdminClient();
    
    // Count pending edit requests
    const { count: editCount } = await adminClient
        .from('kyc_edit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
    // Count new initial verifications
    const { count: newCount } = await adminClient
        .from('policy_holder_kyc')
        .select('*', { count: 'exact', head: true })
        .eq('kyc_submitted', true)
        .eq('admin_verified', false)
        .eq('admin_reset', false);
        
    return (editCount || 0) + (newCount || 0);
}

// ─── Admin: Get KYC details for a specific member ────────────────────────────

export async function getAdminMemberKYC(memberId: string) {
    const adminClient = createAdminClient();

    const { data: kyc, error } = await adminClient
        .from('policy_holder_kyc')
        .select('*')
        .eq('member_id', memberId)
        .maybeSingle();

    if (error) return { success: false, error: error.message };

    // Also get the edit request if any
    const { data: editReq } = await adminClient
        .from('kyc_edit_requests')
        .select('*')
        .eq('member_id', memberId)
        .eq('status', 'pending')
        .maybeSingle();

    return { success: true, data: kyc, pendingRequest: editReq };
}

// ─── Admin: Approve a KYC edit request (sets admin_reset = true on KYC) ──────

export async function approveKYCEditRequest(requestId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Get the request
    const { data: req, error: reqErr } = await adminClient
        .from('kyc_edit_requests')
        .select('id, member_id, status')
        .eq('id', requestId)
        .single();

    if (reqErr || !req) return { success: false, error: 'Request not found' };
    if (req.status !== 'pending') return { success: false, error: 'Request is not pending' };

    // Mark request as approved
    const { error: updateErr } = await adminClient
        .from('kyc_edit_requests')
        .update({
            status: 'approved',
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

    if (updateErr) return { success: false, error: updateErr.message };

    // Set admin_reset = true on the KYC record so customer can re-submit
    await adminClient
        .from('policy_holder_kyc')
        .update({ admin_reset: true, admin_reset_by: user.id, admin_reset_at: new Date().toISOString() })
        .eq('member_id', req.member_id);

    return { success: true, memberId: req.member_id };
}

// ─── Admin: Reject a KYC edit request ────────────────────────────────────────

export async function rejectKYCEditRequest(requestId: string, adminNote?: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await adminClient
        .from('kyc_edit_requests')
        .update({
            status: 'rejected',
            admin_note: adminNote?.trim() || null,
            resolved_by: user.id,
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// ─── Admin: Directly update KYC details (after approving + editing) ──────────

export async function adminUpdateKYCDetails(memberId: string, updates: {
    holderFullName?: string;
    relation?: string;
    aadhaarNumber?: string;
    aadhaarDeclaration?: boolean;
    panNumber?: string;
    panDeclaration?: boolean;
    adminNote?: string;
}) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const now = new Date().toISOString();
    const payload: any = {
        updated_at: now,
        admin_reset: false, // clear the reset flag after admin edits
        admin_verified: true,
        admin_verified_at: now,
        admin_verified_by: user.id,
    };

    if (updates.holderFullName) payload.holder_full_name = updates.holderFullName.trim();
    if (updates.relation) payload.relation = updates.relation;
    if (updates.aadhaarDeclaration !== undefined) {
        payload.aadhaar_declaration = updates.aadhaarDeclaration;
        payload.aadhaar_number = updates.aadhaarDeclaration ? null : (updates.aadhaarNumber?.replace(/\s/g, '') || null);
    }
    if (updates.panDeclaration !== undefined) {
        payload.pan_declaration = updates.panDeclaration;
        payload.pan_number = updates.panDeclaration ? null : (updates.panNumber?.toUpperCase() || null);
    }
    if (updates.adminNote) payload.admin_notes = updates.adminNote;

    const { error } = await adminClient
        .from('policy_holder_kyc')
        .update(payload)
        .eq('member_id', memberId);

    if (error) return { success: false, error: error.message };

    // Also update ecard_members if name or relation changed
    if (updates.holderFullName || updates.relation) {
        const memberUpdate: any = {};
        if (updates.holderFullName) memberUpdate.full_name = updates.holderFullName.trim();
        if (updates.relation) memberUpdate.relation = updates.relation;
        await adminClient.from('ecard_members').update(memberUpdate).eq('id', memberId);
    }

    return { success: true, message: 'KYC details updated successfully.' };
}

// ─── Admin: Get KYC details for ALL members of a user ────────────────────────

export async function getUserMembersWithKYC(userId: string) {
    const adminClient = createAdminClient();

    const { data: members, error } = await adminClient
        .from('ecard_members')
        .select(`
            id,
            full_name,
            relation,
            card_unique_id,
            status,
            valid_from,
            valid_till,
            policy_holder_kyc (
                id,
                holder_full_name,
                relation,
                aadhaar_number,
                aadhaar_declaration,
                aadhaar_file_url,
                pan_number,
                pan_declaration,
                pan_file_url,
                photo_url,
                kyc_submitted,
                kyc_submitted_at,
                admin_reset,
                admin_verified,
                admin_verified_at,
                admin_notes
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message, data: [] };

    // Get pending edit requests for this user's members
    const memberIds = (members || []).map((m: any) => m.id);
    const { data: editRequests } = memberIds.length > 0
        ? await adminClient
            .from('kyc_edit_requests')
            .select('member_id, status, reason, created_at')
            .in('member_id', memberIds)
            .eq('status', 'pending')
        : { data: [] };

    const editReqMap = new Map<string, any>();
    for (const r of (editRequests || [])) {
        editReqMap.set(r.member_id, r);
    }

    return {
        success: true,
        data: (members || []).map((m: any) => {
            const kyc = Array.isArray(m.policy_holder_kyc) ? m.policy_holder_kyc[0] : m.policy_holder_kyc;
            return {
                id: m.id,
                fullName: m.full_name,
                relation: m.relation,
                cardId: m.card_unique_id,
                status: m.status,
                validFrom: m.valid_from,
                validTill: m.valid_till,
                kyc: kyc ? {
                    id: kyc.id,
                    holderFullName: kyc.holder_full_name,
                    relation: kyc.relation,
                    aadhaarNumber: kyc.aadhaar_number,
                    aadhaarDeclaration: kyc.aadhaar_declaration,
                    aadhaarFileUrl: kyc.aadhaar_file_url,
                    panNumber: kyc.pan_number,
                    panDeclaration: kyc.pan_declaration,
                    panFileUrl: kyc.pan_file_url,
                    photoUrl: kyc.photo_url,
                    kycSubmitted: kyc.kyc_submitted,
                    kycSubmittedAt: kyc.kyc_submitted_at,
                    adminReset: kyc.admin_reset,
                    adminVerified: kyc.admin_verified,
                    adminNote: kyc.admin_notes,
                } : null,
                pendingEditRequest: editReqMap.get(m.id) || null,
            };
        }),
    };
}

// ─── Admin: Get pending initial KYC Verifications ──────────────────────────────

export async function getKYCVerifications(filters?: { status?: string; page?: number; limit?: number }) {
    const adminClient = createAdminClient();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = adminClient
        .from('policy_holder_kyc')
        .select(`
            *,
            ecard_members(card_unique_id),
            profiles!policy_holder_kyc_user_id_fkey(full_name, email, phone)
        `, { count: 'exact' })
        .eq('kyc_submitted', true);

    if (filters?.status === 'pending') {
        query = query.eq('admin_verified', false).eq('admin_reset', false);
    } else if (filters?.status === 'verified') {
        query = query.eq('admin_verified', true);
    } else if (filters?.status === 'rejected') {
        query = query.eq('admin_reset', true);
    }

    query = query.range(from, to).order('kyc_submitted_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message, data: [], totalCount: 0 };

    return {
        success: true,
        totalCount: count || 0,
        data: (data || []).map((r: any) => ({
            id: r.id,
            memberId: r.member_id,
            userId: r.user_id,
            memberName: r.holder_full_name,
            memberRelation: r.relation,
            cardId: r.ecard_members?.card_unique_id || '',
            customerName: r.profiles?.full_name || 'Unknown',
            customerEmail: r.profiles?.email || '',
            customerPhone: r.profiles?.phone || '',
            aadhaarNumber: r.aadhaar_number,
            aadhaarDeclaration: r.aadhaar_declaration,
            aadhaarFileUrl: r.aadhaar_file_url,
            panNumber: r.pan_number,
            panDeclaration: r.pan_declaration,
            panFileUrl: r.pan_file_url,
            photoUrl: r.photo_url,
            status: r.admin_verified ? 'verified' : r.admin_reset ? 'rejected' : 'pending',
            adminNote: r.admin_notes,
            submittedAt: r.kyc_submitted_at,
            verifiedAt: r.admin_verified_at,
        })),
    };
}

export async function verifyInitialKYC(memberId: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await adminClient
        .from('policy_holder_kyc')
        .update({
            admin_verified: true,
            admin_verified_by: user.id,
            admin_verified_at: new Date().toISOString(),
            admin_reset: false,
        })
        .eq('member_id', memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function rejectInitialKYC(memberId: string, note: string) {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await adminClient
        .from('policy_holder_kyc')
        .update({
            admin_reset: true,
            admin_reset_by: user.id,
            admin_reset_at: new Date().toISOString(),
            admin_notes: note,
            kyc_submitted: false, // Reset submission status so they have to submit again
        })
        .eq('member_id', memberId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
