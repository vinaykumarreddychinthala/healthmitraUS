'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Coupon, CouponType, CouponStatus } from '@/types/coupons';

export async function getCoupons() {
    const supabase = await createAdminClient();
    
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('getCoupons error:', error);
        return { success: false, error: error.message };
    }

    const coupons: Coupon[] = (data || []).map((c: any) => ({
        id: c.id,
        code: c.code || '',
        description: '',
        type: (c.discount_type === 'percentage' ? 'percentage' : 'fixed') as CouponType,
        value: Number(c.discount_value) || 0,
        applicablePlans: 'all' as const,
        minPurchaseAmount: undefined,
        maxDiscountAmount: undefined,
        usageType: c.usage_limit ? 'limited' : 'unlimited' as const,
        totalUsesAllowed: c.usage_limit || 0,
        usesPerCustomer: 1,
        currentUses: c.used_count || 0,
        validityType: c.valid_until ? 'limited' : 'always' as const,
        startDate: c.valid_from || '',
        endDate: c.valid_until || '',
        targetCustomers: 'all' as const,
        isExclusive: false,
        showOnWebsite: false,
        terms: '',
        status: c.is_active ? 'active' : 'inactive' as CouponStatus,
        totalDiscountGiven: 0,
        revenueGenerated: 0
    }));

    return { success: true, data: coupons };
}

export async function getCouponLogs(_couponCode: string) {
    return { success: true, data: [] };
}

export async function upsertCoupon(coupon: Partial<Coupon>) {
    const supabase = await createAdminClient();

    if (!coupon.code?.trim()) {
        return { success: false, error: 'Coupon code is required' };
    }

    // Ensure discount_type is always either 'percentage' or 'fixed'
    const discountType = coupon.type === 'percentage' ? 'percentage' : 'fixed';

    const dbPayload: any = {
        code: coupon.code.trim().toUpperCase(),
        discount_value: coupon.value || 0,
        discount_type: discountType,
        is_active: true,
    };

    let error;
    if (coupon.id) {
        // Update: do not reset used_count
        ({ error } = await supabase.from('coupons').update(dbPayload).eq('id', coupon.id));
    } else {
        // Insert: initialise used_count to 0
        ({ error } = await supabase.from('coupons').insert({ ...dbPayload, used_count: 0 }));
    }

    if (error) {
        console.error('Coupon save error:', error);
        return { success: false, error: error.message };
    }
    return { success: true, message: 'Coupon saved successfully' };
}

export async function deleteCoupon(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Coupon deleted' };
}

export async function validatePromoCode(code: string, cartAmount: number) {
    const supabase = await createClient();
    const adminClient = await createAdminClient();

    if (!code) return { success: false, message: 'Please enter a code' };

    // 1. Try Coupon first
    const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

    if (coupon) {
        const now = new Date();
        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
             return { success: false, message: 'Coupon expired' };
        }
        if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
            return { success: false, message: 'Coupon usage limit reached' };
        }

        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = (cartAmount * Number(coupon.discount_value)) / 100;
        } else {
            discount = Number(coupon.discount_value);
        }
        return { success: true, data: { type: 'coupon', code: coupon.code, discount, finalPrice: cartAmount - discount } };
    }

    // 2. Try Franchise Code
    const { data: franchise } = await supabase
        .from('franchises')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('status', 'active')
        .single();

    if (franchise) {
        // Get referral discount from settings
        const { data: settings } = await adminClient.from('system_settings')
            .select('key, value')
            .eq('key', 'referral_discount')
            .single();
        
        const discountPercent = parseFloat(settings?.value || '10');
        const discount = (cartAmount * discountPercent) / 100;

        return { success: true, data: { type: 'referral', code: franchise.code, discount, finalPrice: cartAmount - discount } };
    }

    return { success: false, message: 'Invalid or expired code' };
}
