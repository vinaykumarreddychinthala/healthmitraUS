'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { User, UserType } from '@/types/user';
import { sendMail } from '@/lib/email';
import { franchiseWelcomeTemplate } from '@/lib/email-templates';

// --- USER ACTIONS ---

interface GetUsersFilters {
    query?: string;
    type?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
}

export async function getUsers(filters: GetUsersFilters) {
    const supabase = await createAdminClient();

    let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

    if (filters.query) {
        query = query.or(`full_name.ilike.%${filters.query}%,email.ilike.%${filters.query}%,phone.ilike.%${filters.query}%`);
    }

    if (filters.type && filters.type !== 'all') {
        const roleMap: Record<string, string> = { 
            'Admin': 'admin', 
            'Customer': 'user', 
            'Referral Partner': 'franchise_owner',
            'Employee': 'employee'
        };
        const role = roleMap[filters.type];
        if (role) {
            if (role === 'user') {
                query = query.in('role', ['user', 'customer']);
            } else {
                query = query.eq('role', role);
            }
        }
    }

    if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) return { success: false, error: error.message };

    // Compute stats from count queries
    const { count: totalCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: adminCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin');
    const { count: employeeCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee');
    const { count: partnerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'franchise_owner');
    const { count: customerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).in('role', ['user', 'customer']);
    const { count: activeCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: potentialCount } = await supabase.from('otp_verifications').select('*', { count: 'exact', head: true }).eq('converted', false);

    const stats = {
        total: totalCount || 0,
        admins: adminCount || 0,
        employees: employeeCount || 0,
        partners: partnerCount || 0,
        customers: customerCount || 0,
        active: activeCount || 0,
        potential: potentialCount || 0,
    };

    const users: User[] = data.map((p: any) => {
        let type: UserType = 'Customer';
        if (p.role === 'admin') type = 'Admin';
        if (p.role === 'franchise_owner') type = 'Referral Partner';
        if (p.role === 'employee') type = 'Employee';

        return {
            id: p.id,
            name: p.full_name || 'Unknown',
            email: p.email,
            phone: p.phone,
            type: type,
            status: p.status || 'active',
            joinedDate: new Date(p.created_at).toISOString().split('T')[0],
            avatar: p.avatar_url,
            departmentId: p.department_id,
            designation: p.designation,
            city: p.city,
            state: p.state,
        };
    });

    return { success: true, data: users, stats, totalCount: count || 0 };
}

// --- GET VERIFIED USERS (from the dedicated `users` table) ---
// These are people who verified their OTP. May or may not have bought a plan.
export async function getVerifiedUsers(filters?: {
    query?: string;
    status?: string;
    page?: number;
    limit?: number;
}) {
    const supabase = await createAdminClient();

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('users')
        .select('*', { count: 'exact' });

    if (filters?.query) {
        query = query.or(`name.ilike.%${filters.query}%,email.ilike.%${filters.query}%,phone.ilike.%${filters.query}%`);
    }

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    query = query.range(from, to).order('verified_at', { ascending: false });

    const { data, error, count } = await query;
    if (error) return { success: false, error: error.message };

    const users = (data || []).map((u: any) => ({
        id: u.id,
        userId: u.user_id,     // null until they purchase
        name: u.name || 'Unknown',
        email: u.email,
        phone: u.phone,
        interestedPlanId: u.interested_plan_id,
        hasPurchased: !!u.user_id,  // true if linked to auth account
        source: u.source,
        status: u.status,
        verifiedAt: u.verified_at,
        createdAt: u.created_at,
    }));

    // Stats
    const { count: totalVerified } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: totalConverted } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('user_id', 'is', null);

    return {
        success: true,
        data: users,
        totalCount: count || 0,
        stats: {
            totalVerified: totalVerified || 0,
            totalConverted: totalConverted || 0,
            notConverted: (totalVerified || 0) - (totalConverted || 0),
        },
    };
}


export async function getUser(id: string) {
    const supabase = await createAdminClient();
    const { data: p, error } = await supabase.from('profiles').select('*').eq('id', id).single();

    if (error) return { success: false, error: error.message };

    let type: UserType = 'Customer';
    if (p.role === 'admin') type = 'Admin';
    if (p.role === 'franchise_owner') type = 'Referral Partner';

    const user: User = {
        id: p.id,
        name: p.full_name || 'Unknown',
        email: p.email,
        phone: p.phone,
        type: type,
        status: p.status || 'active',
        joinedDate: new Date(p.created_at).toISOString().split('T')[0],
        avatar: p.avatar_url
    };

    return { success: true, data: user };
}

export async function createUser(data: Partial<User> & { departmentId?: string; designation?: string; city?: string; state?: string }) {
    const adminSupabase = await createAdminClient();

    // Check if user already exists in profiles
    const { data: existingProfile } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('email', data.email)
        .single();

    if (existingProfile) {
        return { success: false, error: 'User with this email already exists' };
    }

    // Create auth user with admin API
    const tempPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 12) + 'A1!';
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
            full_name: data.name,
            phone: data.phone,
        }
    });

    if (authError) {
        return { success: false, error: authError.message };
    }

    if (!authData.user) {
        return { success: false, error: 'Failed to create auth user' };
    }

    // Determine role
    let role = 'user';
    if (data.type === 'Admin') role = 'admin';
    else if (data.type === 'Employee') role = 'employee';
    else if (data.type === 'Referral Partner') role = 'franchise_owner';

    // Create profile with the auth user's id
    const { error: profileError } = await adminSupabase.from('profiles').upsert({
        id: authData.user.id,
        email: data.email,
        full_name: data.name,
        phone: data.phone,
        role: role,
        status: data.status || 'active',
        department_id: data.departmentId || null,
        designation: data.designation || null,
        city: data.city || null,
        state: data.state || null,
    });

    if (profileError) {
        // If profile creation fails, clean up the auth user
        await adminSupabase.auth.admin.deleteUser(authData.user.id);
        return { success: false, error: profileError.message };
    }

    // Send welcome email with credentials
    if (data.email) {
        try {
            if (role === 'franchise_owner') {
                await sendMail({
                    to: data.email,
                    subject: 'Welcome to HealthMitra Parivar',
                    devData: { 'Email': data.email, 'Password': tempPassword },
                    html: franchiseWelcomeTemplate({
                        franchiseName: data.name || 'Partner',
                        userId: data.email,
                        password: tempPassword
                    })
                });
            } else {
                await sendMail({
                    to: data.email,
                    subject: 'Welcome to HealthMitra - Account Created',
                    devData: { 'Email': data.email, 'Password': tempPassword },
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                            <p>Dear ${data.name || 'User'},</p>
                            <p>An account has been created for you on HealthMitra.</p>
                            <p>Here are your login credentials:</p>
                            <ul>
                                <li><strong>User ID / Email:</strong> ${data.email}</li>
                                <li><strong>Password:</strong> ${tempPassword}</li>
                            </ul>
                            <p>Please login at <a href="https://www.healthmitraus.com">www.healthmitraus.com</a>.</p>
                        </div>
                    `
                });
            }
        } catch (mailError) {
            console.error('Error sending welcome email:', mailError);
        }
    }

    return { success: true, message: 'User created successfully', tempPassword };
}

export async function updateUser(id: string, data: Partial<User> & { departmentId?: string; designation?: string; city?: string; state?: string; dob?: string; gender?: string; role?: string }) {
    const supabase = await createAdminClient();

    const updates: any = {};
    if (data.name) updates.full_name = data.name;
    if (data.email) updates.email = data.email;
    if (data.phone) updates.phone = data.phone;
    if (data.dob) updates.dob = data.dob;
    if (data.gender) updates.gender = data.gender;
    if (data.departmentId !== undefined) updates.department_id = data.departmentId;
    if (data.designation !== undefined) updates.designation = data.designation;
    if (data.city !== undefined) updates.city = data.city;
    if (data.state !== undefined) updates.state = data.state;
    
    // Handle role updates
    if (data.role || data.type) {
        let newRole = data.role;
        if (!newRole && data.type) {
            const roleMap: Record<string, string> = {
                'Customer': 'user',
                'Admin': 'admin',
                'Referral Partner': 'franchise_owner',
                'Employee': 'employee',
                'Doctor': 'doctor',
                'Diagnostic Center': 'diagnostic_center',
                'Pharmacy': 'pharmacy'
            };
            newRole = roleMap[data.type] || 'user';
        }
        if (newRole) updates.role = newRole;
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'User updated successfully' };
}

export async function toggleUserStatus(id: string, status: 'active' | 'inactive') {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully` };
}

export async function updateBankDetails(id: string, bankDetails: any) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('profiles').update({
        bank_holder_name: bankDetails.holderName,
        bank_account_number: bankDetails.accountNumber,
        bank_ifsc: bankDetails.ifsc,
        bank_name: bankDetails.bankName,
        bank_branch: bankDetails.branch,
        account_type: bankDetails.accountType,
    }).eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Bank details updated successfully' };
}

export async function updateDocuments(id: string, documents: any) {
    const supabase = await createAdminClient();
    const updates: any = {};
    if (documents.aadhaar) updates.aadhaar_number = documents.aadhaar;
    if (documents.pan) updates.pan_number = documents.pan;

    const { error } = await supabase.from('profiles').update(updates).eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Documents updated successfully' };
}

export async function changePlan(id: string, planId: string, planName: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('ecard_members').update({ plan_id: planId }).eq('user_id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: `Plan changed to ${planName}` };
}

export async function resendCredentials(id: string, method: 'whatsapp' | 'email') {
    const supabase = await createAdminClient();
    
    // Get user details
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, phone, full_name')
        .eq('id', id)
        .single();

    if (profileError || !profile) {
        return { success: false, error: 'User not found' };
    }

    // Generate a new temporary password
    const tempPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 12) + 'A1!';
    
    // Update user password
    const { error: updateError } = await supabase.auth.admin.updateUserById(id, {
        password: tempPassword,
    });

    if (updateError) {
        return { success: false, error: 'Failed to reset password: ' + updateError.message };
    }

    // Log the action
    await supabase.from('audit_logs').insert({
        user_id: id,
        action: `resend_credentials_${method}`,
        entity_type: 'user',
        entity_id: id,
    });

    if (method === 'email' && profile.email) {
        try {
            await sendMail({
                to: profile.email,
                subject: 'Your HealthMitra Credentials Reset',
                devData: { 'Email': profile.email, 'Password': tempPassword },
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                        <p>Dear ${profile.full_name || 'User'},</p>
                        <p>Your password has been reset by the administrator.</p>
                        <p>Here are your updated login credentials:</p>
                        <ul>
                            <li><strong>User ID / Email:</strong> ${profile.email}</li>
                            <li><strong>Password:</strong> ${tempPassword}</li>
                        </ul>
                        <p>Please login at <a href="https://www.healthmitraus.com">www.healthmitraus.com</a> and change your password.</p>
                    </div>
                `
            });
        } catch (mailError) {
            console.error('Error sending reset credentials email:', mailError);
        }
    }

    // For now, we'll return success and the method used
    return { 
        success: true, 
        message: `Credentials sent via ${method === 'whatsapp' ? 'WhatsApp' : 'Email'}`,
        tempPassword // In production, don't return the password - send it via the messaging service
    };
}

export async function activateNewPlan(id: string, planId: string) {
    const supabase = await createAdminClient();
    
    // Get user profile for full_name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', id)
        .single();

    if (!profile) {
        return { success: false, error: 'User not found' };
    }

    // Get plan details
    const { data: plan } = await supabase
        .from('plans')
        .select('name, duration_days')
        .eq('id', planId)
        .single();

    // Expire existing active plans
    await supabase
        .from('ecard_members')
        .update({ status: 'expired' })
        .eq('user_id', id)
        .eq('relation', 'Self')
        .eq('status', 'active');

    // Calculate validity
    const validFrom = new Date();
    const durationDays = plan?.duration_days || 365;
    const validTill = new Date(validFrom);
    validTill.setDate(validTill.getDate() + durationDays);

    // Generate member ID
    const memberIdCode = `HM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    const cardUniqueId = `HM-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { error } = await supabase.from('ecard_members').insert({
        user_id: id,
        plan_id: planId,
        member_id_code: memberIdCode,
        card_unique_id: cardUniqueId,
        full_name: profile.full_name,
        relation: 'Self',
        status: 'active',
        valid_from: validFrom.toISOString().split('T')[0],
        valid_till: validTill.toISOString().split('T')[0],
    });

    if (error) return { success: false, error: error.message };
    return { success: true, message: `Plan "${plan?.name || 'selected plan'}" activated successfully` };
}

// --- DEPARTMENT ACTIONS ---

export async function getDepartments() {
    const supabase = await createAdminClient();
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (data && data.length > 0) return { success: true, data };

    // Fallback: try CMS
    const { data: cmsData } = await supabase.from('cms_content').select('value').eq('key', 'departments').single();
    if (cmsData) return { success: true, data: cmsData.value };

    return { success: true, data: [] };
}

export async function createDepartment(dept: Partial<any>) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('departments').insert({
        name: dept.name,
        head_name: dept.head,
        description: dept.description,
        status: 'active',
    });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Department added' };
}

export async function deleteDepartment(id: string) {
    const supabase = await createAdminClient();
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Department deleted' };
}

export async function getUserPolicyMembers(userId: string) {
    const adminSupabase = await createAdminClient();
    try {
        const { data, error } = await adminSupabase
            .from('ecard_members')
            .select(`
                id, 
                full_name, 
                relation, 
                status, 
                card_unique_id,
                policy_holder_kyc (
                    id,
                    kyc_submitted,
                    admin_verified,
                    admin_verified_at,
                    photo_url,
                    aadhaar_number,
                    aadhaar_declaration,
                    aadhaar_file_url,
                    pan_number,
                    pan_declaration,
                    pan_file_url
                )
            `)
            .eq('user_id', userId);

        if (error) throw error;
        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
