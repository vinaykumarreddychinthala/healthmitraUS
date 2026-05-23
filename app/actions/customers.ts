'use server';

import { createAdminClient } from '@/lib/supabase/server';

// --- HELPER: Generate Member ID Code ---
async function generateMemberIdCode(adminSupabase: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `HM-${year}-`;

    const { data } = await adminSupabase
        .from('ecard_members')
        .select('member_id_code')
        .ilike('member_id_code', `${prefix}%`)
        .order('member_id_code', { ascending: false })
        .limit(1);

    let seq = 1;
    if (data && data.length > 0 && data[0].member_id_code) {
        const last = data[0].member_id_code as string;
        const parts = last.split('-');
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) seq = lastNum + 1;
    }

    return `${prefix}${String(seq).padStart(5, '0')}`;
}

// --- HELPER: Generate Card Unique ID ---
function generateCardUniqueId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = (n: number) =>
        Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `HM-${rand(4)}-${rand(4)}`;
}

// generatePassword lives in lib/utils/password.ts (client-safe, not a server action)

// --- CREATE CUSTOMER WITH OPTIONAL PLAN ---
export interface CreateCustomerData {
    // Personal Info
    fullName: string;
    email: string;
    phone: string;
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    // Credentials
    password: string;
    // Plan Assignment (optional)
    planId?: string;
    validFrom?: string;      // ISO date string
    // Family Members to add
    familyMembers?: FamilyMemberInput[];
}

export interface FamilyMemberInput {
    fullName: string;
    relation: string;
    dob?: string;
    gender?: string;
    bloodGroup?: string;
    contactNumber?: string;
    email?: string;
    aadhaarLast4?: string;
}

export async function createCustomer(data: CreateCustomerData) {
    const adminSupabase = await createAdminClient();

    // 1. Check duplicate email
    const { data: existing } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .single();

    if (existing) {
        return { success: false, error: 'A customer with this email already exists.' };
    }

    // 2. Create Supabase auth user
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            full_name: data.fullName,
            phone: data.phone,
        },
    });

    if (authError || !authData.user) {
        return { success: false, error: authError?.message || 'Failed to create auth user' };
    }

    const userId = authData.user.id;

    // 3. Create profile (use upsert to handle trigger-created profile)
    const { error: profileError } = await adminSupabase.from('profiles').upsert({
        id: userId,
        email: data.email,
        full_name: data.fullName,
        phone: data.phone,
        role: 'user',
        status: 'active',
        dob: data.dob || null,
        gender: data.gender || null,
        blood_group: data.bloodGroup || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
    }, { onConflict: 'id' });

    if (profileError) {
        await adminSupabase.auth.admin.deleteUser(userId);
        return { success: false, error: profileError.message };
    }

    // 4. Assign plan and create self e-card member if plan selected
    if (data.planId) {
        const result = await _assignPlan(adminSupabase, userId, data.fullName, data.planId, data.validFrom);
        if (!result.success) {
            // Non-fatal: user created, plan assignment failed
            return {
                success: true,
                userId,
                warning: `Customer created but plan assignment failed: ${result.error}`,
            };
        }
    }

    // 5. Add family members if provided
    if (data.familyMembers && data.familyMembers.length > 0) {
        for (const member of data.familyMembers) {
            await _addFamilyMember(adminSupabase, userId, data.planId || null, member);
        }
    }

    return { success: true, userId };
}

// --- INTERNAL: Assign Plan (creates self e-card member) ---
async function _assignPlan(
    adminSupabase: any,
    userId: string,
    fullName: string,
    planId: string,
    validFrom?: string,
) {
    // Fetch plan to get duration_days
    const { data: plan, error: planErr } = await adminSupabase
        .from('plans')
        .select('id, duration_days, name')
        .eq('id', planId)
        .single();

    if (planErr || !plan) {
        return { success: false, error: 'Plan not found' };
    }

    const from = validFrom ? new Date(validFrom) : new Date();
    const till = new Date(from);
    till.setDate(till.getDate() + (plan.duration_days || 365));

    const memberIdCode = await generateMemberIdCode(adminSupabase);
    const cardUniqueId = generateCardUniqueId();

    const { error } = await adminSupabase.from('ecard_members').insert({
        user_id: userId,
        plan_id: planId,
        member_id_code: memberIdCode,
        card_unique_id: cardUniqueId,
        full_name: fullName,
        relation: 'Self',
        valid_from: from.toISOString().split('T')[0],
        valid_till: till.toISOString().split('T')[0],
        status: 'active',
    });

    if (error) return { success: false, error: error.message };
    return { success: true, memberIdCode, cardUniqueId };
}

// --- INTERNAL: Add Family Member ---
export async function _addFamilyMember(
    adminSupabase: any,
    userId: string,
    planId: string | null,
    member: FamilyMemberInput,
) {
    // Get the self member's valid dates if exists
    let validFrom: string | null = null;
    let validTill: string | null = null;

    if (planId) {
        const { data: selfMember } = await adminSupabase
            .from('ecard_members')
            .select('valid_from, valid_till')
            .eq('user_id', userId)
            .eq('relation', 'Self')
            .eq('plan_id', planId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (selfMember) {
            validFrom = selfMember.valid_from;
            validTill = selfMember.valid_till;
        }
    }

    const memberIdCode = await generateMemberIdCode(adminSupabase);
    const cardUniqueId = generateCardUniqueId();

    await adminSupabase.from('ecard_members').insert({
        user_id: userId,
        plan_id: planId,
        member_id_code: memberIdCode,
        card_unique_id: cardUniqueId,
        full_name: member.fullName,
        relation: member.relation,
        dob: member.dob || null,
        gender: member.gender || null,
        blood_group: member.bloodGroup || null,
        contact_number: member.contactNumber || null,
        email: member.email || null,
        aadhaar_last4: member.aadhaarLast4 || null,
        valid_from: validFrom,
        valid_till: validTill,
        status: planId ? 'active' : 'pending',
    });
}

// --- ASSIGN PLAN TO EXISTING CUSTOMER ---
export async function assignPlanToCustomer(
    userId: string,
    planId: string,
    validFrom?: string,
) {
    const adminSupabase = await createAdminClient();

    // Get user profile for full_name
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

    if (!profile) return { success: false, error: 'Customer not found' };

    const result = await _assignPlan(adminSupabase, userId, profile.full_name, planId, validFrom);
    return result;
}

// --- ADD FAMILY MEMBER TO EXISTING CUSTOMER ---
export async function addFamilyMember(userId: string, member: FamilyMemberInput) {
    const adminSupabase = await createAdminClient();

    // Get the user's current active plan
    const { data: selfMember } = await adminSupabase
        .from('ecard_members')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('relation', 'Self')
        .eq('status', 'active')
        .single();

    const planId = selfMember?.plan_id || null;
    await _addFamilyMember(adminSupabase, userId, planId, member);
    return { success: true, message: 'Family member added successfully' };
}

// --- RESET CUSTOMER PASSWORD ---
export async function resetCustomerPassword(userId: string, newPassword: string) {
    const adminSupabase = await createAdminClient();

    const { error } = await adminSupabase.auth.admin.updateUserById(userId, {
        password: newPassword,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Password reset successfully' };
}

// --- GET CUSTOMERS WITH PLAN INFO (from dedicated customers table) ---
export async function getCustomers(filters?: {
    query?: string;
    planId?: string;
    status?: string;
    page?: number;
    limit?: number;
}) {
    const adminSupabase = await createAdminClient();

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = adminSupabase
        .from('customers')
        .select('*, plans(name)', { count: 'exact' });

    if (filters?.query) {
        query = query.or(
            `full_name.ilike.%${filters.query}%,email.ilike.%${filters.query}%,phone.ilike.%${filters.query}%`
        );
    }

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    if (filters?.planId && filters.planId !== 'all') {
        if (filters.planId === 'none') {
            query = query.is('plan_id', null);
        } else {
            query = query.eq('plan_id', filters.planId);
        }
    }

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    const customers = (data || []).map((c: any) => ({
        id: c.id,
        userId: c.user_id,
        fullName: c.full_name || 'Unknown',
        email: c.email,
        phone: c.phone,
        planId: c.plan_id,
        planName: c.plan_name || c.plans?.name || null,
        memberId: c.member_id_code,
        cardUniqueId: c.card_unique_id,
        amountPaid: c.amount_paid,
        paymentMethod: c.payment_method,
        transactionId: c.transaction_id,
        validFrom: c.valid_from,
        validTill: c.valid_till,
        status: c.status || 'active',
        createdAt: c.created_at,
    }));

    return { success: true, data: customers, totalCount: count || 0 };
}

// --- GET CUSTOMER STATS ---
export async function getCustomerStats() {
    const adminSupabase = await createAdminClient();
    const { count: total }   = await adminSupabase.from('customers').select('*', { count: 'exact', head: true });
    const { count: active }  = await adminSupabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: expired } = await adminSupabase.from('customers').select('*', { count: 'exact', head: true }).eq('status', 'expired');
    return { total: total || 0, active: active || 0, expired: expired || 0 };
}


// --- GET SINGLE CUSTOMER DETAIL ---
export async function getCustomerDetail(userId: string) {
    const adminSupabase = await createAdminClient();

    // Fetch from profiles (auth account data)
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (!profile) return { success: false, error: 'Customer not found' };

    // Fetch from customers table (purchase records)
    const { data: customerRecords } = await adminSupabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    // Fetch ecard members (self + family)
    const { data: members } = await adminSupabase
        .from('ecard_members')
        .select('*, plans(name, price, duration_days)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    return {
        success: true,
        data: {
            profile,
            customers: customerRecords || [],   // purchase records from customers table
            members: members || [],             // e-card members (self + family)
        },
    };
}
