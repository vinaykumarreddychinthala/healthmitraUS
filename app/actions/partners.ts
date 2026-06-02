'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Partner, SubPartner, PartnerCommission, PartnerKYC } from '@/types/partners';
import { sendMail } from '@/lib/email';
import { 
    partnerApplicationNotificationTemplate, 
    partnerApplicationConfirmationTemplate,
    partnerApplicationAcceptedTemplate,
    partnerApplicationRejectedTemplate
} from '@/lib/email-templates';

// --- PARTNER LISTING ---

export async function getPartnerStats() {
    const supabase = await createAdminClient();
    
    const { count: total } = await supabase
        .from('franchises')
        .select('*', { count: 'exact', head: true });

    const { count: active } = await supabase
        .from('franchises')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

    const { data: partners } = await supabase
        .from('franchises')
        .select('total_commission, total_sales');

    const totalCommission = partners?.reduce((sum, p) => sum + (p.total_commission || 0), 0) || 0;
    const totalRevenue = partners?.reduce((sum, p) => sum + (p.total_sales || 0), 0) || 0;

    return {
        success: true,
        data: {
            total: total || 0,
            active: active || 0,
            totalCommission,
            totalRevenue
        }
    };
}

export async function partnerLogin(email: string, password: string) {
    const supabase = await createAdminClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Verify if user is a partner
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Authentication failed' };

    // Check if user has franchise profile
    const { data: franchise } = await supabase.from('franchises').select('id').eq('contact_email', email).single();

    // Also check franchise_partners table
    const { data: subPartner } = await supabase.from('franchise_partners').select('id').eq('email', email).single();

    if (!franchise && !subPartner) {
        // Sign out if not a partner
        await supabase.auth.signOut();
        return { success: false, error: 'Access denied. Partner account not found.' };
    }

    return { success: true, message: 'Login successful' };
}

export async function getPartners(filters: { query?: string; status?: string } = {}) {
    const supabase = await createAdminClient();

    let query = supabase.from('franchises').select('*');

    if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    if (filters.query) {
        query = query.or(`franchise_name.ilike.%${filters.query}%,contact_email.ilike.%${filters.query}%,code.ilike.%${filters.query}%`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const partners: Partner[] = data.map((p: any) => ({
        id: p.id,
        name: p.franchise_name,
        email: p.contact_email,
        phone: p.contact_phone,
        altPhone: p.alt_phone,
        referralCode: p.code,
        commissionPercent: p.commission_percent || 10,
        status: p.status || 'active',
        kycStatus: p.kyc_status || p.verification_status || 'pending',
        city: p.city || '',
        state: p.state || '',
        address: p.address,
        pincode: p.pincode,
        bankDetails: p.bank_details,
        totalSales: p.total_sales || 0,
        totalCommission: p.total_commission || 0,
        totalSubPartners: 0,
        mouSigned: p.mou_signed || false,
        mouDate: p.mou_date,
        canAddSubPartners: p.can_add_sub_partners || false,
        designationAccess: p.designation_access || false,
        joinedDate: p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        lastActive: p.last_active,
        aadhaarNumber: p.aadhaar_number,
        panNumber: p.pan_number
    }));

    // Calculate generic stats based on fetched data
    const stats = {
        total: partners.length,
        active: partners.filter(p => p.status === 'active').length,
        kycVerified: partners.filter(p => p.kycStatus === 'verified').length,
        totalRevenue: partners.reduce((acc, p) => acc + (p.totalCommission || 0), 0),
    };

    return { success: true, data: partners, stats };
}

// --- SINGLE PARTNER ---

export async function getPartner(id: string) {
    const supabase = await createAdminClient();
    const { data: partner, error } = await supabase.from('franchises').select('*').eq('id', id).single();

    if (error || !partner) return { success: false, error: 'Partner not found' };

    const { data: subData } = await supabase.from('franchise_partners').select('*').eq('franchise_id', id);

    const p: Partner = {
        id: partner.id,
        name: partner.franchise_name,
        email: partner.contact_email,
        phone: partner.contact_phone,
        altPhone: partner.alt_phone,
        referralCode: partner.code,
        commissionPercent: partner.commission_percent || 10,
        status: partner.status,
        kycStatus: partner.verification_status,
        city: partner.city,
        state: partner.state,
        address: partner.address,
        pincode: partner.pincode,
        bankDetails: partner.bank_details,
        totalSales: partner.total_sales || 0,
        totalCommission: partner.total_commission || 0,
        totalSubPartners: subData?.length || 0,
        mouSigned: partner.mou_signed,
        mouDate: partner.mou_date,
        canAddSubPartners: partner.can_add_sub_partners,
        designationAccess: partner.designation_access,
        joinedDate: partner.created_at,
        lastActive: partner.last_active
    };

    const subPartners: SubPartner[] = (subData || []).map((sp: any) => ({
        id: sp.id,
        parentPartnerId: sp.franchise_id,
        name: sp.partner_name,
        email: sp.email,
        phone: sp.phone,
        referralCode: sp.code || 'N/A',
        commissionPercent: sp.commission_percent || 0,
        status: sp.status,
        designation: sp.designation,
        salesCount: sp.sales_count || 0,
        totalRevenue: sp.total_revenue || 0,
        joinedDate: sp.joined_at
    }));

    return {
        success: true,
        data: {
            partner: p,
            subPartners,
            commissions: [] // Empty for now
        }
    };
}

// --- CREATE / UPDATE PARTNER ---

export async function createPartner(data: Partial<Partner>) {
    const supabase = await createAdminClient();
    const hasDocs = data.aadhaarFront || data.aadhaarBack || data.panCard || data.photo;
    const { error } = await supabase.from('franchises').insert({
        franchise_name: data.name,
        contact_email: data.email,
        contact_phone: data.phone,
        alt_phone: data.altPhone,
        code: data.referralCode,
        commission_percent: data.commissionPercent,
        city: data.city,
        state: data.state,
        address: data.address,
        pincode: data.pincode,
        bank_details: data.bankDetails,
        can_add_sub_partners: data.canAddSubPartners,
        designation_access: data.designationAccess,
        status: 'active',
        aadhaar_number: data.aadhaarNumber,
        pan_number: data.panNumber,
        aadhaar_front: data.aadhaarFront,
        aadhaar_back: data.aadhaarBack,
        pan_card: data.panCard,
        photo: data.photo,
        kyc_status: data.kycStatus || (hasDocs ? 'submitted' : 'pending'),
        verification_status: hasDocs ? 'in_review' : 'pending'
    });

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Partner created successfully' };
}

export async function updatePartner(id: string, data: Partial<Partner>) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('franchises').update({
        franchise_name: data.name,
        contact_email: data.email,
        contact_phone: data.phone,
        alt_phone: data.altPhone,
        commission_percent: data.commissionPercent,
        city: data.city,
        state: data.state,
        address: data.address,
        pincode: data.pincode,
        bank_details: data.bankDetails,
        can_add_sub_partners: data.canAddSubPartners,
        designation_access: data.designationAccess,
        status: data.status,
        mou_signed: data.mouSigned,
    }).eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Partner updated successfully' };
}

export async function submitPartnerApplication(data: Partial<Partner>) {
    // This action can be called from a public facing page, so we use a regular client or admin client?
    // Using admin client to bypass RLS for inserting into franchises if needed, or if public insert is allowed.
    // The franchise table RLS for insert might not be enabled for anon. 
    // We'll use createAdminClient to ensure the application goes through.
    const supabase = await createAdminClient();
    const { error } = await supabase.from('franchises').insert({
        franchise_name: data.name,
        contact_email: data.email,
        contact_phone: data.phone,
        alt_phone: data.altPhone,
        code: data.referralCode,
        commission_percent: 10, // Default for new applications
        city: data.city,
        state: data.state,
        address: data.address,
        pincode: data.pincode,
        bank_details: data.bankDetails,
        aadhaar_number: data.aadhaarNumber,
        pan_number: data.panNumber,
        can_add_sub_partners: data.canAddSubPartners,
        designation_access: data.designationAccess,
        status: 'pending',
        verification_status: 'pending',
        kyc_status: 'pending'
    });

    if (error) return { success: false, error: error.message };

    // Send Emails
    try {
        // To Admin
        await sendMail({
            to: process.env.ADMIN_EMAIL || 'admin@healthmitraus.com',
            subject: 'New Partner Application Received',
            html: partnerApplicationNotificationTemplate({
                name: data.name,
                email: data.email,
                phone: data.phone,
                city: data.city,
                state: data.state
            })
        });

        // To Applicant
        if (data.email) {
            await sendMail({
                to: data.email,
                subject: 'Application Received - HealthMitra Partner Program',
                html: partnerApplicationConfirmationTemplate({
                    name: data.name
                })
            });
        }
    } catch (mailError) {
        console.error('Error sending application emails:', mailError);
    }

    return { success: true, message: 'Application submitted successfully' };
}

export async function updatePartnerStatus(id: string, status: 'active' | 'rejected') {
    const supabase = await createAdminClient();

    // Fetch partner details first to get email and name
    const { data: partnerData, error: fetchError } = await supabase
        .from('franchises')
        .select('franchise_name, contact_email')
        .eq('id', id)
        .single();

    if (fetchError) return { success: false, error: fetchError.message };

    const { error } = await supabase.from('franchises')
        .update({ status })
        .eq('id', id);

    if (error) return { success: false, error: error.message };

    // Send Acceptance/Rejection email
    if (partnerData?.contact_email) {
        try {
            const subject = status === 'active' 
                ? 'Welcome to HealthMitra - Partner Application Accepted' 
                : 'Update on your HealthMitra Partner Application';
            const html = status === 'active' 
                ? partnerApplicationAcceptedTemplate({ name: partnerData.franchise_name })
                : partnerApplicationRejectedTemplate({ name: partnerData.franchise_name });

            await sendMail({
                to: partnerData.contact_email,
                subject,
                html
            });
        } catch (mailError) {
            console.error('Error sending application status email:', mailError);
        }
    }

    return { success: true, message: `Partner ${status === 'active' ? 'accepted' : 'rejected'} successfully` };
}

// --- SUB-PARTNERS ---

export async function getSubPartners(partnerId: string) {
    const supabase = await createAdminClient();
    const { data } = await supabase.from('franchise_partners').select('*').eq('franchise_id', partnerId);

    if (!data) return { success: true, data: [] };

    const subs: SubPartner[] = data.map((sp: any) => ({
        id: sp.id,
        parentPartnerId: sp.franchise_id,
        name: sp.partner_name,
        email: sp.email,
        phone: sp.phone,
        referralCode: sp.code || 'N/A',
        commissionPercent: sp.commission_percent || 0,
        status: sp.status,
        designation: sp.designation,
        salesCount: sp.sales_count || 0,
        totalRevenue: sp.total_revenue || 0,
        joinedDate: sp.joined_at
    }));

    return { success: true, data: subs };
}

export async function addSubPartner(partnerId: string, data: Partial<SubPartner>) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('franchise_partners').insert({
        franchise_id: partnerId,
        partner_name: data.name,
        email: data.email,
        phone: data.phone,
        status: 'active',
        joined_at: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Sub-partner added successfully' };
}
// --- PARTNER PORTAL ACTIONS ---

export async function getCurrentPartner() {
    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) return { success: false, error: 'Not authenticated' };

    // Fetch by email for now, assuming 1:1 mapping
    const { data: partner, error } = await supabase.from('franchises').select('*').eq('contact_email', user.email).single();

    if (error || !partner) return { success: false, error: 'Partner profile not found for this user.' };

    return await getPartner(partner.id);
}

export async function getPartnerCommissions(partnerId: string) {
    const supabase = await createAdminClient();
    // Assuming 'partner_commissions' table exists
    const { data, error } = await supabase.from('partner_commissions').select('*').eq('partner_id', partnerId).order('sale_date', { ascending: false });

    if (error) {
        console.error('Error fetching commissions:', error);
        return { success: true, data: [] }; // Return empty if table missing/error to avoid crashing
    }

    const commissions: PartnerCommission[] = (data || []).map((c: any) => ({
        id: c.id,
        partnerId: c.partner_id,
        partnerName: c.partner_name || '',
        saleId: c.sale_id,
        customerName: c.customer_name,
        planName: c.plan_name,
        saleAmount: c.sale_amount,
        commissionPercent: c.commission_percent,
        commissionAmount: c.commission_amount,
        status: (c.status as any) || 'pending',
        saleDate: c.sale_date,
        payoutDate: c.payout_date
    }));

    return { success: true, data: commissions };
}

// --- KYC MANAGEMENT ---
export async function getPartnerKYC(partnerId: string): Promise<{ success: boolean; data?: PartnerKYC; error?: string }> {
    const supabase = await createAdminClient();
    
    const { data: partnerData, error } = await supabase
        .from('franchises')
        .select('aadhaar_number, aadhaar_front, aadhaar_back, pan_number, pan_card, photo, kyc_status, kyc_history, verification_status, verified_at, verified_by, rejection_reason')
        .eq('id', partnerId)
        .single();

    if (error) return { success: false, error: 'Partner not found' };

    return {
        success: true,
        data: {
            aadhaarNumber: partnerData.aadhaar_number || '',
            aadhaarFront: partnerData.aadhaar_front || '',
            aadhaarBack: partnerData.aadhaar_back || '',
            panNumber: partnerData.pan_number || '',
            panCard: partnerData.pan_card || '',
            photo: partnerData.photo || '',
            kycStatus: partnerData.kyc_status || 'pending',
            history: (partnerData.kyc_history || []).map((h: any, i: number) => ({
                id: `history_${i}`,
                status: h.status || 'submitted',
                timestamp: h.timestamp || new Date().toISOString(),
                performedBy: h.by || 'system',
                notes: h.reason || ''
            })),
            verificationStatus: partnerData.verification_status || 'unverified',
            verifiedAt: partnerData.verified_at || null,
            verifiedBy: partnerData.verified_by || null,
            rejectionReason: partnerData.rejection_reason || ''
        }
    };
}

export async function updatePartnerKYC(
    partnerId: string,
    data: {
        aadhaarNumber?: string;
        aadhaarFront?: string;
        aadhaarBack?: string;
        panNumber?: string;
        panCard?: string;
        photo?: string;
    }
): Promise<{ success: boolean; message?: string; error?: string }> {
    const supabase = await createAdminClient();

    const updates: any = {};
    if (data.aadhaarNumber) updates.aadhaar_number = data.aadhaarNumber;
    if (data.aadhaarFront) updates.aadhaar_front = data.aadhaarFront;
    if (data.aadhaarBack) updates.aadhaar_back = data.aadhaarBack;
    if (data.panNumber) updates.pan_number = data.panNumber;
    if (data.panCard) updates.pan_card = data.panCard;
    if (data.photo) updates.photo = data.photo;
    
    if (data.aadhaarNumber || data.aadhaarFront || data.panNumber || data.panCard) {
        updates.kyc_status = 'submitted';
        updates.verification_status = 'in_review';
    }

    const { error } = await supabase
        .from('franchises')
        .update(updates)
        .eq('id', partnerId);

    if (error) return { success: false, error: error.message };

    return { success: true, message: 'KYC documents updated successfully' };
}

export async function verifyPartnerKYC(
    partnerId: string,
    status: 'verified' | 'rejected',
    rejectionReason?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
    const supabase = await createAdminClient();

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
        .eq('id', partnerId);

    if (error) return { success: false, error: error.message };

    // Add to KYC history
    const { data: partnerData } = await supabase
        .from('franchises')
        .select('kyc_history')
        .eq('id', partnerId)
        .single();

    const history = partnerData?.kyc_history || [];
    history.push({
        status,
        timestamp: new Date().toISOString(),
        by: user?.id || 'system',
        reason: rejectionReason || ''
    });

    await supabase
        .from('franchises')
        .update({ kyc_history: history })
        .eq('id', partnerId);

    return { success: true, message: `KYC ${status} successfully` };
}

export async function uploadPartnerKYCDocument(
    partnerId: string,
    docType: 'aadhaar_front' | 'aadhaar_back' | 'pan_card' | 'photo',
    file: File
): Promise<{ success: boolean; url?: string; error?: string }> {
    const supabase = await createAdminClient();
    
    try {
        const fileName = `kyc/${partnerId}/${docType}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, file, { upsert: true });
        
        if (uploadError) {
            return { success: false, error: uploadError.message };
        }
        
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(fileName);
        
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
            .eq('id', partnerId);
        
        return { success: true, url: urlData.publicUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
