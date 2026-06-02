'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Franchise, FranchiseModule, DEFAULT_MODULES } from '@/types/franchise';

export async function getFranchiseStats() {
    const supabase = await createAdminClient();
    
    const { count: total } = await supabase
        .from('franchises')
        .select('*', { count: 'exact', head: true });

    const { count: active } = await supabase
        .from('franchises')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    const { count: verified } = await supabase
        .from('franchises')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');

    const { data: franchises } = await supabase
        .from('franchises')
        .select('total_members, total_sales');

    const totalMembers = franchises?.reduce((sum, f) => sum + (f.total_members || 0), 0) || 0;
    const totalSales = franchises?.reduce((sum, f) => sum + (f.total_sales || 0), 0) || 0;

    return {
        success: true,
        data: {
            total: total || 0,
            active: active || 0,
            verified: verified || 0,
            totalMembers,
            totalSales
        }
    };
}

export async function getFranchises(query?: string) {
    const supabase = await createAdminClient();

    let dbQuery = supabase
        .from('franchises')
        .select('*');

    if (query) {
        dbQuery = dbQuery.or(`franchise_name.ilike.%${query}%,city.ilike.%${query}%,code.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching franchises:', error);
        return { success: false, error: error.message };
    }

    const { data: partnersData } = await supabase
        .from('franchise_partners')
        .select('franchise_id');

    const partnerCounts: Record<string, number> = {};
    partnersData?.forEach((p: any) => {
        partnerCounts[p.franchise_id] = (partnerCounts[p.franchise_id] || 0) + 1;
    });

    const franchises = data.map((f: any) => ({
        id: f.id,
        name: f.franchise_name,
        startDate: new Date(f.created_at).toISOString().split('T')[0],
        endDate: '',
        contact: f.contact_phone || '',
        altContact: f.alt_phone || '',
        email: f.contact_email || '',
        referralCode: f.code,
        website: f.website || '',
        gst: f.gst_number || '',
        commissionPercent: f.commission_percentage || 10,
        kycStatus: f.kyc_status || (f.verification_status === 'verified' ? 'verified' : f.verification_status === 'submitted' ? 'submitted' : 'pending') as 'pending' | 'submitted' | 'verified' | 'rejected',
        verificationStatus: f.verification_status || 'unverified',
        address: f.address || '',
        city: f.city || '',
        state: f.state || '',
        payoutDelay: 0,
        status: f.status || 'active',
        createdAt: f.created_at,
        totalPartners: partnerCounts[f.id] || 0,
        totalRevenue: f.total_sales || 0,
        aadhaarNumber: f.aadhaar_number,
        panNumber: f.pan_number
    }));

    return { success: true, data: franchises };
}

export async function getFranchise(id: string) {
    const supabase = await createAdminClient();

    const { data: franchiseData, error } = await supabase
        .from('franchises')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return { success: false, error: 'Franchise not found' };

    const franchise = {
        id: franchiseData.id,
        name: franchiseData.franchise_name,
        startDate: new Date(franchiseData.created_at).toISOString().split('T')[0],
        endDate: '',
        contact: franchiseData.contact_phone || '',
        altContact: '',
        email: franchiseData.contact_email || '',
        password: '', // Should not return password
        referralCode: franchiseData.code,
        website: '',
        gst: franchiseData.gst_number || '',
        commissionPercent: franchiseData.commission_percentage,
        kycStatus: (franchiseData.verification_status === 'verified' ? 'verified' : 'pending') as 'pending' | 'submitted' | 'verified' | 'rejected',
        verificationStatus: (franchiseData.verification_status || 'unverified') as 'unverified' | 'in_review' | 'verified' | 'suspended',
        address: franchiseData.address || '',
        city: franchiseData.city || '',
        state: franchiseData.state || '',
        payoutDelay: 0,
        status: franchiseData.status,
        createdAt: franchiseData.created_at,
        totalPartners: 0,
        totalRevenue: 0
    };

    // Fetch partners
    const { data: partnersData } = await supabase
        .from('franchise_partners')
        .select('*')
        .eq('franchise_id', id);

    const partners = partnersData?.map((p: any) => ({
        id: p.id,
        name: p.partner_name,
        email: p.email,
        phone: p.phone,
        status: p.status,
        joinedAt: p.joined_at,
        plansCount: 0,
        revenue: 0
    })) || [];

    // Modules (Mock for now or store in DB)
    const modules = DEFAULT_MODULES;

    // Activities (from audit logs?)
    const activities: any[] = [];

    return { success: true, data: { franchise, modules, activities, partners } };
}

export async function createFranchise(data: Partial<Franchise>) {
    const supabase = await createAdminClient();

    const hasDocs = data.aadhaarFront || data.aadhaarBack || data.panCard || data.photo;
    const { error } = await supabase.from('franchises').insert({
        franchise_name: data.name,
        code: data.referralCode,
        contact_email: data.email,
        contact_phone: data.contact,
        gst_number: data.gst,
        address: data.address,
        city: data.city,
        state: data.state,
        commission_percentage: data.commissionPercent,
        status: 'active',
        aadhaar_number: data.aadhaarNumber,
        pan_number: data.panNumber,
        aadhaar_front: data.aadhaarFront,
        aadhaar_back: data.aadhaarBack,
        pan_card: data.panCard,
        photo: data.photo,
        kyc_status: data.kycStatus || (hasDocs ? 'submitted' : 'pending'),
        verification_status: hasDocs ? 'in_review' : 'unverified'
    });

    if (error) return { success: false, error: error.message };

    return { success: true, message: 'Franchise created successfully' };
}

export async function updateFranchise(id: string, data: Partial<Franchise>) {
    const supabase = await createAdminClient();

    const updates: any = {};
    if (data.name) updates.franchise_name = data.name;
    if (data.email) updates.contact_email = data.email;
    if (data.contact) updates.contact_phone = data.contact;
    if (data.city) updates.city = data.city;

    const { error } = await supabase.from('franchises').update(updates).eq('id', id);

    if (error) return { success: false, error: error.message };

    return { success: true, message: 'Franchise updated successfully' };
}

export async function deleteFranchise(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('franchises').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    return { success: true, message: 'Franchise deleted' };
}

export async function assignModules(franchiseId: string, modules: FranchiseModule[]) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('franchises').update({ modules: modules }).eq('id', franchiseId);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Modules updated successfully' };
}

export async function getFranchiseActivity(franchiseId: string) {
    const supabase = await createAdminClient();
    const { data } = await supabase.from('audit_logs').select('*')
        .eq('entity_type', 'franchise').eq('entity_id', franchiseId)
        .order('created_at', { ascending: false }).limit(20);
    return { success: true, data: data || [] };
}

// --- KYC MANAGEMENT ---
export async function getFranchiseKYC(franchiseId: string) {
    const supabase = await createAdminClient();
    
    // Get franchise KYC data
    const { data: franchiseData, error } = await supabase
        .from('franchises')
        .select('aadhaar_number, aadhaar_front, aadhaar_back, pan_number, pan_card, photo, kyc_status, kyc_history, verification_status, verified_at, verified_by, rejection_reason')
        .eq('id', franchiseId)
        .single();

    if (error) return { success: false, error: 'Franchise not found' };

    return {
        success: true,
        data: {
            aadhaarNumber: franchiseData.aadhaar_number || '',
            aadhaarFront: franchiseData.aadhaar_front || '',
            aadhaarBack: franchiseData.aadhaar_back || '',
            panNumber: franchiseData.pan_number || '',
            panCard: franchiseData.pan_card || '',
            photo: franchiseData.photo || '',
            kycStatus: franchiseData.kyc_status || 'pending',
            history: (franchiseData.kyc_history || []).map((h: any, i: number) => ({
                id: `history_${i}`,
                status: h.status || 'submitted',
                timestamp: h.timestamp || new Date().toISOString(),
                performedBy: h.by || 'system',
                notes: h.reason || ''
            })),
            verificationStatus: franchiseData.verification_status || 'unverified',
            verifiedAt: franchiseData.verified_at || null,
            verifiedBy: franchiseData.verified_by || null,
            rejectionReason: franchiseData.rejection_reason || ''
        }
    };
}

export async function updateFranchiseKYC(
    franchiseId: string,
    data: {
        aadhaarNumber?: string;
        aadhaarFront?: string;
        aadhaarBack?: string;
        panNumber?: string;
        panCard?: string;
        photo?: string;
    }
) {
    const supabase = await createAdminClient();

    const updates: any = {};
    if (data.aadhaarNumber) updates.aadhaar_number = data.aadhaarNumber;
    if (data.aadhaarFront) updates.aadhaar_front = data.aadhaarFront;
    if (data.aadhaarBack) updates.aadhaar_back = data.aadhaarBack;
    if (data.panNumber) updates.pan_number = data.panNumber;
    if (data.panCard) updates.pan_card = data.panCard;
    if (data.photo) updates.photo = data.photo;
    
    // Update KYC status to submitted if documents are provided
    if (data.aadhaarNumber || data.aadhaarFront || data.panNumber || data.panCard) {
        updates.kyc_status = 'submitted';
        updates.verification_status = 'in_review';
    }

    const { error } = await supabase
        .from('franchises')
        .update(updates)
        .eq('id', franchiseId);

    if (error) return { success: false, error: error.message };

    // Log the KYC update
    await supabase.from('audit_logs').insert({
        entity_type: 'franchise',
        entity_id: franchiseId,
        action: 'kyc_document_updated',
        description: 'KYC documents updated',
    });

    return { success: true, message: 'KYC documents updated successfully' };
}

export async function verifyFranchiseKYC(franchiseId: string, status: 'verified' | 'rejected', rejectionReason?: string) {
    const supabase = await createAdminClient();

    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();

    const updates: any = {
        verification_status: status,
        kyc_status: status === 'verified' ? 'verified' : 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: user?.id || 'system'
    };

    if (status === 'rejected' && rejectionReason) {
        updates.rejection_reason = rejectionReason;
    }

    const { error } = await supabase
        .from('franchises')
        .update(updates)
        .eq('id', franchiseId);

    if (error) return { success: false, error: error.message };

    // Add to KYC history
    const { data: franchiseData } = await supabase
        .from('franchises')
        .select('kyc_history')
        .eq('id', franchiseId)
        .single();

    const history = franchiseData?.kyc_history || [];
    history.push({
        status,
        timestamp: new Date().toISOString(),
        by: user?.id || 'system',
        reason: rejectionReason || ''
    });

    await supabase
        .from('franchises')
        .update({ kyc_history: history })
        .eq('id', franchiseId);

    // Log the verification
    await supabase.from('audit_logs').insert({
        entity_type: 'franchise',
        entity_id: franchiseId,
        action: `kyc_${status}`,
        description: `KYC ${status}${rejectionReason ? `: ${rejectionReason}` : ''}`,
    });

    return { success: true, message: `KYC ${status} successfully` };
}

export async function uploadKYCDocument(
    franchiseId: string,
    docType: 'aadhaar_front' | 'aadhaar_back' | 'pan_card' | 'photo',
    file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
    const supabase = await createAdminClient();
    
    try {
        const fileName = `kyc/${franchiseId}/${docType}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) {
            return { success: false, error: uploadError.message };
        }
        
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);
        
        // Update the franchise record with the document URL
        const updateField: Record<string, string> = {
            aadhaar_front: 'aadhaar_front',
            aadhaar_back: 'aadhaar_back',
            pan_card: 'pan_card',
            photo: 'photo'
        };
        
        await supabase
            .from('franchises')
            .update({ 
                [updateField[docType]]: urlData.publicUrl,
                kyc_status: 'submitted',
                verification_status: 'in_review'
            })
            .eq('id', franchiseId);
        
        return { success: true, url: urlData.publicUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// DEPRECATED: Franchise login should be handled through Supabase Auth
// This function is not secure and should not be used for authentication
export async function franchiseLogin(email: string, password: string) {
    const regularClient = await createClient();
    const adminClient = await createAdminClient();
    
    // Verify the calling user is authenticated and is an admin
    const { data: { user } } = await regularClient.auth.getUser();
    
    if (!user) {
        return { success: false, error: 'Not authenticated' };
    }
    
    const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
    
    if (profile?.role !== 'admin') {
        return { success: false, error: 'Admin access required to manage franchises' };
    }

    // For franchise operations, we fetch the franchise by email for admin use
    const { data, error } = await adminClient
        .from('franchises')
        .select('*')
        .eq('contact_email', email)
        .single();

    if (error || !data) return { success: false, error: 'Franchise not found' };

    return { success: true, data: data, message: 'Franchise retrieved' };
}
