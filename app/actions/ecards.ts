'use server';

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { _addFamilyMember } from "./customers";

export async function getECards() {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    // Use admin client to bypass RLS
    let { data, error } = await adminClient.from('ecard_members')
        .select('*, plans(name, price, coverage_amount, features), policy_holder_kyc(admin_verified)')
        .eq('user_id', user.id);

    // Fallback to regular client if admin fails
    if (error) {
        ({ data, error } = await supabase.from('ecard_members')
            .select('*, plans(name, price, coverage_amount, features), policy_holder_kyc(admin_verified)')
            .eq('user_id', user.id));
    }

    if (error) return { success: false, error: error.message };

    // Format for View
    const cards = (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        plan_id: m.plan_id,
        card_number: m.card_unique_id || 'PENDING',
        member_name: m.full_name,
        relation: m.relation,
        dob: m.dob,
        gender: m.gender,
        valid_from: m.valid_from,
        valid_till: m.valid_till,
        status: m.status,
        plan_name: m.plans?.name || 'Health Plan',
        plan_price: m.plans?.price || 0,
        plan_features: m.plans?.features || [],
        coverage_amount: m.plans?.coverage_amount || m.coverage_amount || 0,
        emergency_contact: m.contact_number || null,
        adminVerified: Array.isArray(m.policy_holder_kyc) 
            ? m.policy_holder_kyc[0]?.admin_verified || false 
            : m.policy_holder_kyc?.admin_verified || false
    }));

    return { success: true, data: cards };
}

export async function getAvailableMembers() {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // Fetch all members directly
    let { data, error } = await adminClient.from('ecard_members')
        .select('id, full_name, relation, dob, gender')
        .eq('user_id', user.id);

    if (error) {
        ({ data, error } = await supabase.from('ecard_members')
            .select('id, full_name, relation, dob, gender')
            .eq('user_id', user.id));
    }

    if (error || !data) return [];

    return data.map((m: any) => ({
        id: m.id,
        name: m.full_name || m.relation,
        relation: m.relation,
        dob: m.dob,
        gender: m.gender,
        hasCard: !!m.full_name
    }));
}

export async function getMyPurchases() {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    // Fetch ALL member purchases for this user (including Self and family members)
    const { data, error } = await adminClient.from('ecard_members')
        .select('*, plans(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Group purchases by a unique key (card_unique_id or plan_id + valid_from combination)
    // Each ecard_member entry represents a family member on a plan
    // Show each family member as a separate "purchase" entry
    const purchases = (data || []).map((m: any) => {
        // Determine status based on valid_till
        const isExpired = m.valid_till && new Date(m.valid_till) < new Date();
        const status = isExpired ? 'expired' : (m.status === 'active' ? 'active' : m.status);
        
        // Get plan name - prefer plans table, fallback to other fields
        let planName = m.plans?.name;
        if (!planName) {
            // Try to get from related data or use default
            planName = 'Health Plan';
        }
        
        return {
            id: m.id, // Use member ID as the purchase ID
            plan_id: m.plans?.id || m.plan_id,
            plan_name: planName,
            status: status,
            coverage_amount: m.coverage_amount || m.plans?.coverage_amount || 0,
            start_date: m.valid_from,
            expiry_date: m.valid_till,
            created_at: m.created_at,
            price: m.plans?.price || 0,
            type: m.relation === 'Self' ? 'Primary' : 'Family Member',
            member_name: m.full_name,
            relation: m.relation,
            card_number: m.card_unique_id,
            max_members: m.plans?.member_count_max ?? 1,
            isFirstPurchase: m.relation === 'Self'
        };
    });

    // Group by card_unique_id to combine family members under same purchase
    const groupedMap = new Map<string, any>();
    
    for (const p of purchases) {
        const key = p.card_number || p.id;
        if (!groupedMap.has(key)) {
            groupedMap.set(key, { ...p, family_members: [] });
        }
        if (p.relation !== 'Self') {
            const existing = groupedMap.get(key);
            existing.family_members = existing.family_members || [];
            existing.family_members.push({
                id: p.id,
                name: p.member_name,
                relation: p.relation
            });
        }
    }

    const groupedPurchases = Array.from(groupedMap.values());
    
    // Add members_count to each purchase
    for (const p of groupedPurchases) {
        p.members_count = data.filter((d: any) => (d.card_unique_id || d.id) === (p.card_number || p.id)).length;
    }

    // Sort by creation date, newest first
    groupedPurchases.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: groupedPurchases };
}

export async function getPurchaseDetail(id: string) {
    const supabase = await createClient();
    const adminClient = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    // Use admin client to bypass RLS
    let { data, error } = await adminClient.from('ecard_members')
        .select('*, plans(*)')
        .eq('id', id)
        .single();

    // Fallback to regular client if admin fails
    if (error || !data) {
        ({ data, error } = await supabase.from('ecard_members')
            .select('*, plans(*)')
            .eq('id', id)
            .eq('user_id', user.id)
            .single());
    }

    // Final fallback: just check if the record exists for this user
    if (error || !data) {
        return { success: false, error: 'Purchase not found' };
    }

    // Verify ownership
    if (data.user_id !== user.id) {
        return { success: false, error: 'Unauthorized access' };
    }

    return {
        success: true, data: {
            id: data.id,
            status: data.status,
            valid_until: data.valid_till,
            created_at: data.created_at,
            plans: {
                name: data.plans?.name || 'Health Plan',
                coverage_amount: data.plans?.coverage_amount || data.coverage_amount || 0,
                price: data.plans?.price || 0,
                type: 'Family'
            },
            member: {
                name: data.full_name,
                relation: data.relation
            }
        }
    };
}

export async function addUserFamilyMember(planId: string, memberData: any) {
    const supabase = await createClient();
    const adminSupabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    try {
        await _addFamilyMember(adminSupabase, user.id, planId, memberData);
        return { success: true, message: 'Family member added successfully' };
    } catch (err: any) {
        return { success: false, error: err.message || 'Failed to add family member' };
    }
}
