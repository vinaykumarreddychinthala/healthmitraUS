'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ServiceRequest, SRType, SRStatus, Agent } from '@/types/service-requests';
import { sendMail } from '@/lib/email';

interface ProfileData {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    role: string;
}

export async function getCallCentreStats() {
    const supabase = await createAdminClient();
    
    const { count: totalRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true });

    const { count: pendingRequests } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

    const { count: completedToday } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', new Date().toISOString().split('T')[0]);

    const { data: agents } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'agent', 'employee', 'call_center_agent', 'call_centre_agent']);

    const activeAgents = agents?.filter((a: any) => a.role === 'agent').length || 0;

    return {
        success: true,
        data: {
            totalRequests: totalRequests || 0,
            pendingRequests: pendingRequests || 0,
            completedToday: completedToday || 0,
            activeAgents,
            totalAgents: agents?.length || 0
        }
    };
}

interface ServiceRequestRow {
    id: string;
    request_id: string | null;
    user_id: string | null;
    type: string;
    status: string;
    description: string | null;
    priority: string | null;
    admin_notes: string | null;
    assigned_to: string | null;
    created_at: string;
    assigned_at: string | null;
    completed_at: string | null;
    franchise_id: string | null;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
    user?: {
        full_name: string | null;
        email: string | null;
        phone: string | null;
    } | null;
    assignee?: {
        id: string;
        full_name: string | null;
        email: string | null;
        phone: string | null;
    } | null;
}

export async function agentLogin(email: string, password: string) {
    const supabase = await createClient();
    
    // First authenticate using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError || !authData.user) {
        return { success: false, error: 'Invalid credentials.' };
    }

    // Then check if user has agent role
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

    if (profileError || !profile) return { success: false, error: 'Profile not found.' };

    const profileData = profile as ProfileData;
    if (profileData.role !== 'admin' && profileData.role !== 'agent' && profileData.role !== 'employee') {
        // Sign out since they're not authorized
        await supabase.auth.signOut();
        return { success: false, error: 'Not authorized as agent.' };
    }

    return {
        success: true,
        message: `Welcome, ${profileData.full_name}!`,
        data: { agentId: profileData.id, name: profileData.full_name }
    };
}

// --- AGENT DASHBOARD ---

export async function getAgentAssignedRequests(agentId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('service_requests')
        .select(`
            *,
            user:user_id(full_name, email, phone),
            assignee:assigned_to(full_name, email, phone)
        `)
        .eq('assigned_to', agentId)
        .order('updated_at', { ascending: false });

    if (error) return { success: false, data: [] };

    const requests: ServiceRequest[] = data.map((item: ServiceRequestRow): ServiceRequest => ({
        id: item.id,
        requestId: item.request_id || item.id,
        userId: item.user_id || undefined,
        customerName: item.user?.full_name || item.guest_name || 'Unknown',
        customerEmail: item.user?.email || item.guest_email || '',
        customerContact: item.user?.phone || item.guest_phone || '',
        type: item.type as SRType,
        status: item.status as SRStatus,
        description: item.description || '',
        priority: item.priority as ServiceRequest['priority'],
        notes: item.admin_notes ?? undefined,
        assignedToId: item.assigned_to || undefined,
        assignedToName: item.assignee?.full_name ?? undefined,
        requestedAt: item.created_at,
        assignedAt: item.assigned_at || undefined,
        completedAt: item.completed_at || undefined,
        franchiseId: item.franchise_id || undefined,
    }));

    return { success: true, data: requests };
}

// --- ALL REQUESTS (SUPERVISOR VIEW) ---

interface CCFilters {
    query?: string;
    status?: string;
    agentId?: string;
}

export async function getCallCentreRequests(filters: CCFilters = {}) {
    const supabase = await createClient();
    let query = supabase.from('service_requests').select(`
        *,
        user:user_id(full_name, email, phone),
        assignee:assigned_to(full_name, email, phone)
    `, { count: 'exact' });

    if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    if (filters.agentId && filters.agentId !== 'all') {
        query = query.eq('assigned_to', filters.agentId);
    }

    if (filters.query) {
        if (!isNaN(Number(filters.query))) {
            query = query.eq('request_id', Number(filters.query));
        }
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });
    if (error) return { success: false, error: error.message };

    const requests: ServiceRequest[] = data.map((item: ServiceRequestRow): ServiceRequest => ({
        id: item.id,
        requestId: item.request_id || item.id,
        userId: item.user_id || undefined,
        customerName: item.user?.full_name || item.guest_name || 'Unknown',
        customerEmail: item.user?.email || item.guest_email || '',
        customerContact: item.user?.phone || item.guest_phone || '',
        type: item.type as SRType,
        status: item.status as SRStatus,
        description: item.description || '',
        priority: item.priority as ServiceRequest['priority'],
        notes: item.admin_notes ?? undefined,
        assignedToId: item.assigned_to || undefined,
        assignedToName: item.assignee?.full_name ?? undefined,
        requestedAt: item.created_at,
        assignedAt: item.assigned_at || undefined,
        completedAt: item.completed_at || undefined,
        franchiseId: item.franchise_id || undefined,
    }));

    // Stats
    const stats = {
        total: count || 0,
        pending: requests.filter(r => r.status === 'pending').length,
        assigned: requests.filter(r => r.status === 'assigned').length,
        inProgress: requests.filter(r => r.status === 'in_progress').length,
        completed: requests.filter(r => r.status === 'completed').length,
    };

    return { success: true, data: requests, stats };
}

// --- AGENT MANAGEMENT ---

export async function getAgents() {
    const supabase = await createAdminClient();
    const { data } = await supabase.from('profiles').select('*').in('role', ['admin', 'agent', 'employee', 'call_center_agent', 'call_centre_agent']);

    const agentStatus: Agent['status'] = 'available';

    return {
        success: true, data: data?.map((a: ProfileData): Agent => ({
            id: a.id,
            name: a.full_name ?? '',
            email: a.email ?? '',
            phone: a.phone ?? '',
            status: agentStatus,
        })) || []
    };
}

// --- REPORTS ---

export async function getCallCentreReports() {
    const supabase = await createClient();

    const { data: requests } = await supabase
        .from('service_requests')
        .select('type, status, assigned_to');

    const total = requests?.length || 0;

    // Aggregate by type
    const typeMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};
    const agentMap: Record<string, number> = {};

    requests?.forEach((r: any) => {
        if (r.type) typeMap[r.type] = (typeMap[r.type] || 0) + 1;
        if (r.status) statusMap[r.status] = (statusMap[r.status] || 0) + 1;
        if (r.assigned_to) agentMap[r.assigned_to] = (agentMap[r.assigned_to] || 0) + 1;
    });

    const byType = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
    const byStatus = Object.entries(statusMap).map(([name, value]) => ({ name, value }));
    const byAgent = Object.entries(agentMap).map(([agentId, value]) => ({ agentId, value }));

    return { success: true, data: { byType, byStatus, byAgent, total } };
}

// --- ASSIGN REQUEST ---

export async function assignRequestToAgent(requestId: string, agentId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('service_requests')
        .update({ assigned_to: agentId, status: 'assigned', updated_at: new Date().toISOString() })
        .eq('id', requestId);

    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Request assigned successfully' };
}

// --- CREATE AGENT ---

export async function createAgent(data: { name: string; email: string; phone: string; role: string }) {
    const adminSupabase = await createAdminClient();
    
    // First check if auth user exists
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const existingAuth = authUsers?.users.find(u => u.email?.toLowerCase() === data.email.toLowerCase());

    // Check if profile exists
    let profileId = existingAuth?.id;
    if (profileId) {
        const { data: existingProfile } = await adminSupabase
            .from('profiles')
            .select('id, role')
            .eq('id', profileId)
            .single();

        if (existingProfile) {
            // Update existing profile role to call_center_agent (allowed by DB constraint)
            const { error: updateError } = await adminSupabase
                .from('profiles')
                .update({ role: 'call_center_agent', full_name: data.name, phone: data.phone, status: 'active' })
                .eq('id', profileId);

            if (updateError) {
                console.error('Update profile error:', updateError.message);
                return { success: false, error: updateError.message };
            }
            return { success: true, message: 'Agent updated successfully' };
        }
    }

    // Create new auth user if doesn't exist
    if (!existingAuth) {
        const tempPassword = generateTempPassword();
        const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
            email: data.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { full_name: data.name, phone: data.phone }
        });

        if (authError) {
            console.error('Auth create error:', authError.message);
            return { success: false, error: 'Failed to create auth user: ' + authError.message };
        }
        profileId = authData?.user?.id;

        // Send welcome email with credentials
        try {
            await sendMail({
                to: data.email,
                subject: 'Welcome to HealthMitra - Agent Account Created',
                devData: { 'Email': data.email, 'Password': tempPassword },
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
                        <p>Dear ${data.name},</p>
                        <p>An Agent account has been created for you on HealthMitra Call Centre.</p>
                        <p>Here are your temporary login credentials:</p>
                        <ul>
                            <li><strong>User ID / Email:</strong> ${data.email}</li>
                            <li><strong>Password:</strong> ${tempPassword}</li>
                        </ul>
                        <p>Please login to the portal using these credentials.</p>
                    </div>
                `
            });
        } catch (mailError) {
            console.error('Error sending agent welcome email:', mailError);
        }
    }

    if (!profileId) {
        return { success: false, error: 'Failed to get user ID' };
    }

    // Create profile with call_center_agent role (allowed by DB constraint)
    const { error: profileError } = await adminSupabase.from('profiles').insert({
        id: profileId,
        email: data.email,
        full_name: data.name,
        phone: data.phone,
        role: 'call_center_agent',
        status: 'active'
    });

    if (profileError) {
        // If insert fails due to existing profile, try update
        if (profileError.message.includes('duplicate') || profileError.code === '23505') {
            const { error: updateError } = await adminSupabase
                .from('profiles')
                .update({ role: 'call_center_agent', full_name: data.name, phone: data.phone, status: 'active' })
                .eq('id', profileId);

            if (updateError) {
                console.error('Profile update error:', updateError.message);
                return { success: false, error: updateError.message };
            }
            return { success: true, message: 'Agent updated successfully' };
        }
        // Check constraint error
        if (profileError.code === '23514') {
            return { success: false, error: 'Database role constraint error. Please use a valid role.' };
        }
        console.error('Profile insert error:', profileError.message);
        return { success: false, error: 'Failed to create profile: ' + profileError.message };
    }

    return { success: true, message: 'Agent created successfully' };
}

function generateTempPassword(): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%';
    
    const getRandom = (chars: string) => chars.charAt(Math.floor(Math.random() * chars.length));
    
    let password = '';
    password += getRandom(uppercase); // at least 1 uppercase
    password += getRandom(lowercase); // at least 1 lowercase
    password += getRandom(numbers); // at least 1 number
    password += getRandom(special); // at least 1 special
    
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = password.length; i < 12; i++) {
        password += getRandom(allChars);
    }
    
    return password;
}
