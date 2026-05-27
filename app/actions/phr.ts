'use server';

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function getPHRStats() {
    const supabase = await createAdminClient();
    
    const { count: totalMembers } = await supabase
        .from('ecard_members')
        .select('*', { count: 'exact', head: true });

    const { count: totalRecords } = await supabase
        .from('phr_documents')
        .select('*', { count: 'exact', head: true });

    const { data: categories } = await supabase
        .from('phr_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

    const { count: thisMonthRecords } = await supabase
        .from('phr_documents')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

    return {
        success: true,
        data: {
            totalMembers: totalMembers || 0,
            totalRecords: totalRecords || 0,
            thisMonthRecords: thisMonthRecords || 0,
            categories: categories || []
        }
    };
}

export async function getPHRDocuments() {
    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.from('phr_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Transform if necessary to match UI expectations
    // UI expects: id, name, category, user_id, uploaded_at, file_url, created_at
    const documents = data?.map(doc => ({
        ...doc,
        uploaded_at: doc.created_at, // Map created_at to uploaded_at
        file_url: doc.file_url || '#'
    }));

    return { success: true, data: documents };
}

export async function uploadPHRDocument(formData: any) {
    // Handling file upload is complex with Server Actions directly if using FormData
    // For now, we assume the file is uploaded to Storage via client-side or separate API, 
    // and this action records the metadata.
    // OR we implement signed URL generation here.

    // For simplicity given the scope, we'll assume metadata insertion.
    // Real implementation would require Supabase Storage handling.

    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { name, category, file_url } = formData;

    const { data, error } = await supabase.from('phr_documents').insert({
        user_id: user.id,
        name,
        category,
        file_url, // This should come from a storage upload
        created_at: new Date().toISOString()
    }).select().single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}
export async function verifyPatientAccess(data: { type: 'otp' | 'abha', value: string }) {
    const supabase = await createAdminClient();

    // In a real scenario, this would verify OTP against a temporal store or check ABHA integration.
    // For this implementation, we will mock the verification success for specific inputs
    // but fetch REAL data from ecard_members to ensure the flow works.

    // Attempt to find by ABHA (using card_unique_id or other field as proxy)
    if (data.type === 'abha') {
        const { data: member } = await supabase.from('ecard_members')
            .select('*')
            .eq('aadhaar_last4', data.value.slice(-4)) // Mock logic matching last 4
            .single();

        if (member) {
            return {
                success: true,
                message: 'Patient verified successfully',
                data: {
                    id: member.id,
                    name: member.full_name,
                    email: member.email || 'N/A',
                    phone: member.contact_number || 'N/A',
                    planName: 'HealthMitra Plan',
                    memberId: member.member_id_code,
                    relation: member.relation || 'Self',
                    age: member.dob ? new Date().getFullYear() - new Date(member.dob).getFullYear() : 0,
                    gender: (member.gender || 'Other') as 'Male' | 'Female' | 'Other',
                    recordCount: 0,
                    lastUpdated: new Date().toLocaleDateString('en-IN'),
                }
            };
        }
    }

    return { success: false, error: 'Verification failed. Invalid OTP or ID.' };
}

export async function addVendorRecord(memberId: string, data: { category: string, notes: string, addedBy: string, vendorName: string }) {
    const supabase = await createAdminClient();

    // Get member details to find the user_id
    const { data: member } = await supabase.from('ecard_members').select('user_id').eq('id', memberId).single();

    if (!member) return { success: false, error: 'Patient not found' };

    // Insert into phr_documents
    // Note: In real app, we would upload file to storage first. 
    // Here we might be creating a "record" without a file, or using a placeholder.
    const { error } = await supabase.from('phr_documents').insert({
        user_id: member.user_id,
        member_id: memberId,
        name: `${data.vendorName} Record`,
        category: data.category,
        file_url: '#', // Placeholder or from previous upload step
        doctor_name: data.vendorName,
        tags: ['vendor-upload', data.addedBy],
        created_at: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };

    // Log to Audit
    await supabase.from('audit_logs').insert({
        action: 'vendor_add_record',
        target_resource: 'phr_documents',
        details: { memberId, vendor: data.vendorName, category: data.category },
        created_at: new Date().toISOString()
    });

    return { success: true, message: 'Record added successfully' };
}

export async function getVendorAuditLog() {
    const supabase = await createAdminClient();
    // Fetch logs related to vendor actions
    const { data: logs, error } = await supabase.from('audit_logs')
        .select('*')
        .eq('action', 'vendor_add_record')
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Map to UI type
    const auditEntries = logs.map(log => ({
        id: log.id,
        vendorId: log.admin_id || '',
        vendorName: log.details?.vendor || 'Unknown Vendor',
        action: 'add_record' as const,
        memberId: log.details?.memberId || '',
        memberName: log.details?.memberId || 'Unknown Member',
        recordName: log.details?.category || 'Record',
        verificationMethod: 'otp' as const,
        timestamp: log.created_at
    }));

    return { success: true, data: auditEntries };
}

export async function getPatients(query?: string) {
    const supabase = await createAdminClient();

    let dbQuery = supabase.from('ecard_members').select('*, plans(name)');

    if (query) {
        dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,member_id_code.ilike.%${query}%,contact_number.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery.order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    // Get record counts for all members
    const memberIds = data.map((m: any) => m.id);
    const recordCounts: Record<string, number> = {};
    
    if (memberIds.length > 0) {
        const { data: records } = await supabase
            .from('phr_documents')
            .select('member_id');
        
        if (records) {
            records.forEach((r: any) => {
                recordCounts[r.member_id] = (recordCounts[r.member_id] || 0) + 1;
            });
        }
    }

    const patients = data.map((m: any) => ({
        id: m.id,
        name: m.full_name,
        email: m.email || '',
        phone: m.contact_number || '',
        relation: m.relation || 'Self',
        age: m.dob ? new Date().getFullYear() - new Date(m.dob).getFullYear() : 0,
        gender: m.gender || 'Unknown',
        abhaId: m.card_unique_id,
        planName: m.plans?.name || 'Basic Plan',
        recordCount: recordCounts[m.id] || 0,
        lastUpdated: new Date(m.updated_at).toLocaleDateString('en-IN')
    }));

    return { success: true, data: patients };
}

export async function getPatientPHR(memberId: string) {
    const supabase = await createAdminClient();

    // Fetch member details
    const { data: member, error: memberError } = await supabase.from('ecard_members')
        .select('*, plans(name)')
        .eq('id', memberId)
        .single();

    if (memberError || !member) return { success: false, error: 'Patient not found' };

    const patient = {
        id: member.id,
        name: member.full_name,
        email: member.email || '',
        phone: member.contact_number || '',
        relation: member.relation,
        age: member.dob ? new Date().getFullYear() - new Date(member.dob).getFullYear() : 0,
        gender: member.gender || 'Unknown',
        abhaId: member.card_unique_id,
        planName: member.plans?.name || 'Basic Plan',
        recordCount: 0,
        lastUpdated: new Date(member.updated_at).toLocaleDateString()
    };

    // Fetch PHR records
    const { data: docs, error: docError } = await supabase.from('phr_documents')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

    if (docError) return { success: false, error: docError.message };

    const records = docs.map((d: any) => ({
        id: d.id,
        memberId: memberId,
        fileName: d.name,
        fileType: (d.file_type || 'pdf') as 'pdf' | 'jpg' | 'png' | 'dicom',
        fileSize: d.file_size || '1.2 MB',
        uploadedAt: d.created_at,
        category: d.category,
        addedBy: (d.doctor_name === 'Self' ? 'self' : d.doctor_name ? 'vendor' : 'admin') as 'self' | 'vendor' | 'admin',
        vendorName: d.doctor_name,
        tags: d.tags || [],
        url: d.file_url || '#',
    }));

    return { success: true, data: { patient, records } };
}
