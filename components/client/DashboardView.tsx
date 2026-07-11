"use client";

import Link from "next/link";
import { QuickStats } from "@/components/client/QuickStats";
import { QuickActions } from "@/components/client/QuickActions";
import { ActivityFeed } from "@/components/client/ActivityFeed";
import { NotificationsPanel } from "@/components/client/NotificationsPanel";
import { DashboardData } from "@/types/dashboard";
import { AlertTriangle, ArrowRight, CreditCard, ChevronDown } from "lucide-react";
import React, { useState, useEffect } from "react";

// Empty-state fallback when API returns no data
const DEFAULT_EMPTY_DATA: DashboardData = {
    user: {
        id: "guest",
        name: "Guest User",
        email: "guest@example.com",
        phone: "",
        avatar: "",
    },
    activePlans: [],
    eCardStatus: {
        status: "pending" as const,
        totalCards: 0,
        activeCards: 0,
    },
    wallet: {
        balance: 0,
        currency: "USD",
        minimumBalance: 0,
    },
    vouchers: {
        available: 0,
        used: 0,
        expired: 0,
        totalValue: 0,
    },
    services: {
        activeServices: 0,
        completedThisMonth: 0,
        pendingApproval: 0,
    },
    members: {
        totalMembers: 0,
        withActiveCards: 0,
        familyMembers: [],
    },
    reimbursementSummary: {
        totalClaimed: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
    },
    pendingRequests: {
        total: 0,
        breakdown: {
            serviceRequests: 0,
            reimbursements: 0,
        },
    },
    recentActivity: [],
    notifications: [],
};

interface DashboardViewProps {
    initialData?: DashboardData;
}

export function DashboardView({ initialData }: DashboardViewProps) {
    // USE REAL DATA
    const data = initialData || DEFAULT_EMPTY_DATA;
    const loading = false;
    
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    useEffect(() => {
        if (data.activePlans && data.activePlans.length > 0 && !selectedPlanId) {
            setSelectedPlanId(data.activePlans[0].id);
        }
    }, [data.activePlans, selectedPlanId]);

    const markNotificationAsRead = async (id: string) => {
        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllNotificationsAsRead = async () => {
        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase.from('notifications')
                    .update({ is_read: true })
                    .eq('recipient_id', user.id)
                    .eq('is_read', false);
            }
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    const firstName = data.user.name?.split(' ')[0] || 'User';
    const hasActivePlan = data.activePlans && data.activePlans.length > 0;
    const planNames = data.activePlans?.map(p => p.name).join(', ') || '';

    return (
        <div className="space-y-10">
            {/* 1. Welcome Banner */}
            <div className={`animate-fade-in-up relative overflow-hidden rounded-3xl p-8 shadow-2xl text-white ${
                hasActivePlan 
                    ? 'bg-gradient-to-r from-teal-600 via-cyan-600 to-sky-600' 
                    : 'bg-gradient-to-r from-red-600 via-orange-600 to-amber-600'
            }`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl animate-float"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black opacity-10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>

                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-3xl font-bold md:text-4xl mb-2 tracking-tight">
                        Welcome back, {firstName}!
                    </h1>
                    <p className="text-lg mb-6">
                        {hasActivePlan ? (
                            <span className="text-teal-50/90">
                                You have {data.activePlans.length} active <span className="font-bold text-white bg-green-500/30 px-2 py-0.5 rounded">PLAN{data.activePlans.length > 1 ? 'S' : ''}</span>. You have <span className="font-bold text-white">{data.notifications.filter(n => !n.isRead).length} new notifications</span>.
                            </span>
                        ) : (
                            <span className="text-red-200">
                                Your health coverage is <span className="font-bold text-white bg-red-500/80 px-2 py-0.5 rounded">INACTIVE</span>. You have no active plan. <Link href="/shop/plans" className="underline hover:text-white">Buy a plan now</Link>
                            </span>
                        )}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                        <Link href="/service-requests/new" className="btn-premium px-6 py-3 bg-white text-teal-700 font-bold rounded-xl shadow-lg hover:bg-teal-50 hover:scale-105 transition-all active:scale-95 text-center w-full sm:w-auto">
                            Book Service
                        </Link>
                        <Link href={hasActivePlan ? '/my-purchases' : '/shop/plans'} className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all text-center w-full sm:w-auto">
                            {hasActivePlan ? 'Manage Plans' : 'Browse Plans'}
                        </Link>
                    </div>
                </div>
            </div>

            {/* 1b. Pending KYC Banner */}
            {(() => {
                const totalMembers = data.members?.totalMembers || 0;
                const withCards = data.members?.withActiveCards || 0;
                const pendingCount = totalMembers - withCards;
                if (pendingCount <= 0) return null;
                return (
                    <div className="animate-fade-in-up rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 flex flex-col sm:flex-row sm:items-start gap-4" style={{ animationDelay: '60ms' }}>
                        <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-amber-900 text-base mb-1">
                                Complete Member Details to Access Services
                            </h3>
                            <p className="text-sm text-amber-800 leading-relaxed">
                                To unlock and access all Dashboard Services, please complete the details for all ({totalMembers}) member{totalMembers !== 1 ? 's' : ''} included in your plan. ({pendingCount}) member profile{pendingCount !== 1 ? 's are' : ' is'} still pending completion. Fill in the required information to continue.
                            </p>
                            <p className="text-sm text-amber-700 font-semibold mt-2">
                                Pending Profiles: ({pendingCount}) of ({totalMembers}) Member{totalMembers !== 1 ? 's' : ''} Remaining.
                            </p>
                            <Link
                                href="/e-cards"
                                className="inline-flex items-center gap-1.5 mt-3 text-sm font-bold text-amber-900 underline underline-offset-2 hover:text-amber-700 transition-colors"
                            >
                                <CreditCard className="w-4 h-4" />
                                Download E-Card &amp; Complete Member Details
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                );
            })()}

            {/* Plan Selector */}
            {data.activePlans && data.activePlans.length > 0 && (
                <div className="animate-fade-in-up flex flex-col sm:flex-row sm:items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-slate-200 gap-4" style={{ animationDelay: '80ms' }}>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                            <CreditCard className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Viewing Stats For</h3>
                            <p className="text-sm text-slate-500">Select a plan to filter your dashboard</p>
                        </div>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <select 
                            value={selectedPlanId || ''} 
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 font-semibold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer"
                        >
                            {data.activePlans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            )}

            {/* 2. Quick Stats - Now with 8 cards */}
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <QuickStats
                    plans={data.activePlans.filter(p => !selectedPlanId || p.id === selectedPlanId)}
                    eCard={data.eCardStatus}
                    wallet={data.wallet}
                    pending={data.pendingRequests}
                    vouchers={data.vouchers}
                    services={data.services}
                    members={data.members}
                    reimbursement={data.reimbursementSummary}
                    loading={loading}
                    selectedPlanId={selectedPlanId}
                />
            </div>

            {/* 3. Quick Actions */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                <QuickActions />
            </div>

            {/* 4. Activity Feed & Notifications */}
            <div className="grid gap-6 lg:grid-cols-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <ActivityFeed activities={data.recentActivity} loading={loading} />
                <NotificationsPanel
                    notifications={data.notifications}
                    loading={loading}
                    onMarkRead={markNotificationAsRead}
                />
            </div>

        </div>
    );
}
