'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Plan, PlanCategory } from '@/types/plans';

// --- PLANS ACTIONS ---

export async function getPlans(filters?: {
    query?: string;
    status?: string;
    type?: string;
    categoryId?: string;
}) {
    const supabase = await createAdminClient();
    let query = supabase.from('plans').select('*');

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
    }

    if (filters?.query) {
        query = query.ilike('name', `%${filters.query}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Mapping to match Plan interface
    const plans: Plan[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description,
        basePrice: p.price,
        gstPercent: 0,
        totalPrice: p.price,
        status: p.status,
        planImage: p.image_url,
        validityType: 'year',
        validityValue: p.duration_days ? Math.round(p.duration_days / 365) : 1,
        memberCountMin: p.member_count_min ?? 1,
        memberCountMax: p.member_count_max ?? 1,
        categoryIds: p.category_ids || [],
        allowed_services: p.allowed_services || [],
        services: p.features ? p.features.map((f: string, i: number) => ({ id: `f_${i}`, name: f, status: 'enabled' })) : [],
        planDetails: [],
        showOnWebsite: true,
        isFeatured: p.is_featured,
        createdAt: p.created_at,
        updatedAt: p.updated_at
    }));

    return { success: true, data: plans };
}

export async function getPlan(id: string) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('plans').select('*').eq('id', id).single();

    if (error || !data) return { success: false, error: 'Plan not found' };

    const plan: Plan = {
        id: data.id,
        name: data.name,
        type: data.type,
        description: data.description,
        basePrice: data.price,
        gstPercent: 0,
        totalPrice: data.price ? data.price : 0,
        status: data.status,
        planImage: data.image_url,
        validityType: 'year',
        validityValue: data.duration_days ? Math.round(data.duration_days / 365) : 1,
        memberCountMin: data.member_count_min ?? 1,
        memberCountMax: data.member_count_max ?? 1,
        categoryIds: data.category_ids || [],
        allowed_services: data.allowed_services || [],
        services: data.features ? data.features.map((f: string, i: number) => ({ id: `f_${i}`, name: f, status: 'enabled' })) : [],
        planDetails: [],
        showOnWebsite: true,
        isFeatured: data.is_featured,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };

    return { success: true, data: plan };
}

export async function createPlan(data: Partial<Plan>) {
    const supabase = await createAdminClient();
    const planStatus = data.status || 'draft';
    const { error } = await supabase.from('plans').insert({
        name: data.name,
        price: data.basePrice,
        description: data.description,
        features: data.services?.map(s => s.name),
        category_ids: data.categoryIds || [],
        allowed_services: data.allowed_services || [],
        duration_days: (data.validityValue || 1) * (data.validityType === 'month' ? 30 : 365),
        type: data.type,
        status: planStatus,
        is_active: planStatus === 'active',
        is_featured: data.isFeatured,
        image_url: data.planImage,
        member_count_min: data.memberCountMin ?? 1,
        member_count_max: data.memberCountMax ?? 1,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Plan created successfully' };
}

export async function updatePlan(id: string, data: Partial<Plan>) {
    const supabase = await createAdminClient();
    const planStatus = data.status || 'active';
    const { error } = await supabase.from('plans').update({
        name: data.name,
        price: data.basePrice,
        description: data.description,
        features: data.services?.map(s => s.name),
        category_ids: data.categoryIds || [],
        allowed_services: data.allowed_services || [],
        duration_days: data.validityType === 'year' ? (data.validityValue || 1) * 365 : data.validityValue ? data.validityValue * 30 : 365,
        status: planStatus,
        is_active: planStatus === 'active',
        is_featured: data.isFeatured,
        image_url: data.planImage,
        type: data.type,
        member_count_min: data.memberCountMin ?? 1,
        member_count_max: data.memberCountMax ?? 1,
    }).eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Plan updated successfully' };
}

export async function deletePlan(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Plan deleted successfully' };
}

export async function togglePlanStatus(id: string, status: 'active' | 'inactive' | 'draft') {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('plans').update({ 
        status,
        is_active: status === 'active'
    }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: `Plan status updated to ${status}` };
}

export async function copyPlan(id: string) {
    const supabase = await createAdminClient();
    const { data: original } = await supabase.from('plans').select('*').eq('id', id).single();
    if (!original) return { success: false, error: 'Plan not found' };

    const { id: _, created_at, updated_at, ...rest } = original;
    const { error } = await supabase.from('plans').insert({
        ...rest,
        name: `${original.name} (Copy)`,
        status: 'draft'
    });

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Plan copied successfully' };
}

// --- CATEGORIES ACTIONS ---

export async function getCategories() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('plan_categories').select('*').order('display_order', { ascending: true });

    // Fallback if table doesn't exist yet or is empty
    if (error || !data) return { success: true, data: [] };

    const categories: PlanCategory[] = data.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        status: c.status,
        displayOrder: c.display_order
    }));

    return { success: true, data: categories };
}

export async function upsertCategory(data: Partial<PlanCategory>) {
    const supabase = await createAdminClient();
    const payload = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        status: data.status,
        display_order: data.displayOrder
    };

    let error;
    if (data.id) {
        ({ error } = await supabase.from('plan_categories').update(payload).eq('id', data.id));
    } else {
        ({ error } = await supabase.from('plan_categories').insert(payload));
    }

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Category saved successfully' };
}

export async function deleteCategory(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('plan_categories').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Category deleted successfully' };
}
