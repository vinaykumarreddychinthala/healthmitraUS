'use client';

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { DashboardData } from "@/types/dashboard";

async function fetchDashboardDataClient(): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'Not authenticated' };
        }

        const results = await Promise.allSettled([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('wallets').select('*').eq('user_id', user.id).single(),
            supabase.from('ecard_members').select('*, plans(*)').eq('user_id', user.id),
            supabase.from('service_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('reimbursement_claims').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
            supabase.from('notifications').select('*').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(10),
        ]);

        const profileRes = results[0].status === 'fulfilled' ? results[0].value : { data: null, error: results[0].reason };
        const walletRes = results[1].status === 'fulfilled' ? results[1].value : { data: null, error: results[1].reason };
        const membersRes = results[2].status === 'fulfilled' ? results[2].value : { data: null, error: results[2].reason };
        const requestsRes = results[3].status === 'fulfilled' ? results[3].value : { data: null, error: results[3].reason };
        const claimsRes = results[4].status === 'fulfilled' ? results[4].value : { data: null, error: results[4].reason };
        const notifsRes = results[5].status === 'fulfilled' ? results[5].value : { data: null, error: results[5].reason };

        const profile = profileRes.data || { full_name: user.email?.split('@')[0], email: user.email, phone: '' };
        const wallet = walletRes.data || { balance: 0, currency: 'USD' };
        const members = membersRes.data || [];
        const activeMembers = members.filter((m: any) => m.status === 'active');

        const selfMembers = activeMembers.filter((m: any) => m.relation === 'Self' && m.plans);
        const activePlans = selfMembers.map((member: any) => {
            const planData = member.plans;
            let daysRemaining = 0;
            if (member.valid_till) {
                const validTillDate = new Date(member.valid_till);
                if (!isNaN(validTillDate.getTime())) {
                    daysRemaining = Math.max(0, Math.ceil((validTillDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                }
            }
            return {
                id: planData.id,
                planId: planData.id,
                name: planData.name,
                status: member.status,
                validUntil: member.valid_till,
                daysRemaining,
                coverageAmount: member.coverage_amount || planData.coverage_amount || 0
            };
        });

        const recentActivity = [
            ...(requestsRes.data || []).map((r: any) => ({
                id: r.id,
                type: 'service_request' as const,
                title: ((r.type || 'request') as string).replace(/_/g, ' ').toUpperCase(),
                description: r.subject || r.description || '',
                status: (r.status || 'pending') as 'pending' | 'completed' | 'approved' | 'rejected',
                timestamp: r.created_at || new Date().toISOString()
            })),
            ...(claimsRes.data || []).map((c: any) => ({
                id: c.id,
                type: 'reimbursement' as const,
                title: c.title || 'Reimbursement',
                description: `Amount: $${c.amount || 0}`,
                status: (c.status || 'pending') as 'pending' | 'completed' | 'approved' | 'rejected',
                timestamp: c.created_at || new Date().toISOString()
            }))
        ]
        .filter(a => a.timestamp)
        .sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return isNaN(dateA) || isNaN(dateB) ? 0 : dateB - dateA;
        })
        .slice(0, 5);

        const allClaims = claimsRes.data || [];
        const reimbursementSummary = {
            totalClaimed: allClaims.reduce((sum: number, c: any) => sum + (c.amount || 0), 0),
            approved: allClaims.filter((c: any) => c.status === 'approved').reduce((sum: number, c: any) => sum + (c.amount_approved || 0), 0),
            pending: allClaims.filter((c: any) => c.status === 'pending').length,
            rejected: allClaims.filter((c: any) => c.status === 'rejected').length
        };

        const pendingRequests = (requestsRes.data || []).filter((r: any) => r.status === 'pending').length;
        const pendingClaims = allClaims.filter((c: any) => c.status === 'pending').length;

        return {
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: profile.full_name || user.email?.split('@')[0] || 'User',
                    email: user.email ?? '',
                    phone: profile.phone || '',
                    avatar: profile.avatar_url || '',
                },
                activePlans,
                eCardStatus: {
                    status: (activeMembers.length > 0 ? 'active' : 'pending') as 'active' | 'pending' | 'expired',
                    totalCards: members.length,
                    activeCards: activeMembers.length,
                },
                wallet: {
                    balance: wallet.balance || 0,
                    currency: wallet.currency || 'USD',
                    minimumBalance: 0,
                },
                vouchers: { available: 0, used: 0, expired: 0, totalValue: 0 },
                services: { activeServices: 0, completedThisMonth: 0, pendingApproval: 0 },
                members: {
                    totalMembers: members.length,
                    withActiveCards: activeMembers.length,
                    familyMembers: members.map((m: any) => ({ name: m.full_name || 'Unknown', relation: m.relation || 'Self' }))
                },
                reimbursementSummary,
                pendingRequests: {
                    total: pendingRequests + pendingClaims,
                    breakdown: { serviceRequests: pendingRequests, reimbursements: pendingClaims },
                },
                recentActivity,
                notifications: (notifsRes.data || []).map((n: any) => ({
                    id: n.id,
                    type: n.type || 'info',
                    title: n.title || 'Notification',
                    message: n.message || '',
                    timestamp: n.created_at,
                    isRead: n.is_read ?? false
                })),
            },
        };
    } catch (error: any) {
        console.error('Dashboard data fetch error:', error);
        return { success: false, error: error.message || 'Failed to fetch dashboard data' };
    }
}

interface UseDashboardReturn {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    markNotificationAsRead: (id: string) => Promise<void>;
}

export function useDashboard(initialData?: DashboardData): UseDashboardReturn {
    const [data, setData] = useState<DashboardData | null>(initialData || null);
    const [loading, setLoading] = useState<boolean>(!initialData);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async (isInitial: boolean) => {
            if (isInitial && !initialData) setLoading(true);
            try {
                const response = await fetchDashboardDataClient();
                if (isMounted && response.success) {
                    setData(response.data || null);
                    setError(null);
                } else if (isMounted) {
                    setError(response.error || "Failed to fetch data");
                }
            } catch (err) {
                if (isMounted) setError("Network error");
                console.error(err);
            } finally {
                if (isMounted && (isInitial && !initialData)) setLoading(false);
            }
        };

        if (!initialData) {
            fetchData(true);
        }

        const interval = setInterval(() => {
            fetchData(false);
        }, 30000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [initialData]);

    const refresh = async () => {
        setLoading(true);
        const response = await fetchDashboardDataClient();
        if (response.success) {
            setData(response.data || null);
            setError(null);
        } else {
            setError(response.error || "Failed to fetch data");
        }
        setLoading(false);
    };

    const markNotificationAsRead = async (id: string) => {
        if (data) {
            setData({
                ...data,
                notifications: data.notifications.map((n) =>
                    n.id === id ? { ...n, isRead: true } : n
                ),
            });
        }
        try {
            const supabase = createClient();
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    return { data, loading, error, refresh, markNotificationAsRead };
}
