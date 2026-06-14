"use client";

import {
    ActivePlan, ECardStatusData, PendingRequests, WalletData,
    VoucherData, ServiceData, MembersData, ReimbursementData
} from "@/types/dashboard";
import {
    ShieldCheck, CreditCard, Wallet, Clock, Plus, Gift,
    Stethoscope, Users, Receipt, Heart, Phone, Calendar, ArrowRight, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickStatsProps {
    plans?: ActivePlan[];
    eCard?: ECardStatusData;
    wallet?: WalletData;
    pending?: PendingRequests;
    vouchers?: VoucherData;
    services?: ServiceData;
    members?: MembersData;
    reimbursement?: ReimbursementData;
    loading?: boolean;
}

export function QuickStats({
    plans = [], eCard, wallet, pending, vouchers, services, members, reimbursement, loading
}: QuickStatsProps) {
    const totalCoverage = plans.reduce((sum, p) => sum + (p.coverageAmount || 0), 0);
    const maxDaysRemaining = plans.length > 0 ? Math.max(...plans.map(p => p.daysRemaining || 0)) : 0;
    const furthestPlan = plans.length > 0 ? plans.reduce((prev, current) => {
        const prevDate = new Date(prev.validUntil).getTime();
        const currentDate = new Date(current.validUntil).getTime();
        return currentDate > prevDate ? current : prev;
    }) : null;

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Row 1: Plan, E-Card, Wallet, Pending */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 stagger-children">
                {/* Active Plan Card */}
                <Link href="/my-purchases" className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 p-5 text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
                        <ShieldCheck className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 flex h-full flex-col justify-between">
                        <div>
                            <ShieldCheck className="mb-3 h-10 w-10 text-white/90" />
                            <h3 className="text-lg font-semibold">
                                {plans.length === 0 ? "No Active Plan" : `${plans.length} Active Plan${plans.length > 1 ? 's' : ''}`}
                            </h3>
                            {plans.length > 0 && (
                                <p className="text-xs text-cyan-100 mt-0.5">
                                    {plans.map(p => p.name).join(' · ')}
                                </p>
                            )}
                        </div>
                        {furthestPlan?.validUntil && !isNaN(new Date(furthestPlan.validUntil).getTime()) ? (
                            <div className="space-y-1">
                                <p className="text-xs text-cyan-100">Valid until</p>
                                <p className="text-sm font-medium">
                                    {new Date(furthestPlan.validUntil).toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric"
                                    })}
                                </p>
                                <p className="text-xs text-emerald-100 font-medium">
                                    ({maxDaysRemaining} days left)
                                </p>
                            </div>
                        ) : null}
                        <div className="mt-2 text-xs font-medium text-white/80 underline-offset-4 group-hover:underline">
                            View Details →
                        </div>
                    </div>
                </Link>

                {/* E-Card Status Card */}
                <Link href="/e-cards" className="group relative flex flex-col justify-between rounded-xl border border-emerald-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <CreditCard className={cn(
                                "h-10 w-10",
                                eCard?.status === 'active' ? "text-emerald-600" : "text-amber-600"
                            )} />
                            <Badge variant={eCard?.status === 'active' ? "default" : "secondary"}
                                className={cn(
                                    eCard?.status === 'active' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                )}
                            >
                                {eCard?.status === 'active' ? 'Active' : 'Pending'}
                            </Badge>
                        </div>
                        <h3 className="font-semibold text-slate-700">E-Card Status</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {eCard?.totalCards} cards issued
                        </p>
                    </div>
                    <Button size="sm" className="mt-4 w-full sm:w-fit bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                        Download Card
                    </Button>
                </Link>

                {/* Wallet Balance Card */}
                <Link href="/wallet" className="group relative flex flex-col justify-between rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div>
                        <Wallet className="mb-3 h-10 w-10 text-emerald-600" />
                        <h3 className="text-base font-medium text-slate-600">Wallet Balance</h3>
                        <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-emerald-600">
                                $ {wallet?.balance ? wallet.balance.toLocaleString("en-US") : '0'}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500">Available Balance</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-2">
                        <Button size="sm" variant="outline" className="h-8 w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors">
                            <Plus className="mr-1 h-3 w-3 shrink-0" /> Add Money
                        </Button>
                        <span className="text-xs text-teal-600 font-medium group-hover:underline self-start sm:self-auto">
                            History →
                        </span>
                    </div>
                </Link>

                {/* Pending Requests Card */}
                <Link href="/service-requests" className="group relative flex flex-col justify-between rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div>
                        <div className="mb-3">
                            <Clock className="h-10 w-10 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-slate-800">Pending Requests</h3>
                        <div className="mt-4">
                            <span className="text-3xl font-bold text-amber-600">
                                {pending?.total || 0}
                            </span>
                        </div>
                        <div className="mt-2 space-y-1">
                            <p className="text-xs text-slate-600">
                                {pending?.breakdown.serviceRequests} Service Requests
                            </p>
                            <p className="text-xs text-slate-600">
                                {pending?.breakdown.reimbursements} Reimbursements
                            </p>
                        </div>
                    </div>
                    <div className="mt-2 text-xs font-medium text-amber-700 group-hover:underline">
                        View All Tasks →
                    </div>
                </Link>
            </div>

            {/* Row 2: Coverage, Quick Book, Emergency, Family */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-4 md:gap-6 stagger-children">
                {/* Total Coverage Card */}
                <Link href="/my-purchases" className="group relative flex flex-col justify-between rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div>
                        <Heart className="mb-3 h-10 w-10 text-rose-600" />
                        <h3 className="font-semibold text-slate-700">Total Coverage</h3>
                        <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-rose-600">
                                ${totalCoverage.toLocaleString("en-US")}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Health protection</p>
                    </div>
                    <div className="mt-2 text-xs font-medium text-rose-700 group-hover:underline">
                        View Coverage →
                    </div>
                </Link>

                {/* Quick Book Service Card */}
                <Link href="/service-requests/new" className="group relative flex flex-col justify-between rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div>
                        <Calendar className="mb-3 h-10 w-10 text-blue-600" />
                        <h3 className="font-semibold text-slate-700">Book Service</h3>
                        <p className="mt-2 text-sm text-slate-500">Request a new service</p>
                    </div>
                    <div className="mt-4">
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                            <Stethoscope className="mr-1 h-3 w-3 shrink-0" /> New Request
                        </Button>
                    </div>
                </Link>



                {/* Family Members Card */}
                <Link href="/my-purchases" className="group relative flex flex-col justify-between rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div>
                        <Users className="mb-3 h-10 w-10 text-sky-600" />
                        <h3 className="font-semibold text-slate-700">Family</h3>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-sky-600">
                                {members?.totalMembers || 0}
                            </span>
                            <span className="text-xs text-slate-500">members</span>
                        </div>
                    </div>
                    <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">With E-Cards:</span>
                            <span className="font-medium text-slate-700">{members?.withActiveCards || 0}</span>
                        </div>
                    </div>
                    <div className="mt-2 text-xs font-medium text-sky-700 group-hover:underline">
                        Manage Members →
                    </div>
                </Link>

                {/* Support & Help Card */}
                <Link href="/support" className="group relative flex flex-col justify-between rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.02] cursor-pointer min-h-[160px]">
                    <div>
                        <HelpCircle className="mb-3 h-10 w-10 text-teal-600" />
                        <h3 className="font-semibold text-slate-700">Support &amp; Help</h3>
                        <p className="mt-2 text-sm text-slate-500">24/7 assistance available</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <Button size="sm" variant="outline" className="w-full border-teal-200 text-teal-700 hover:bg-teal-100 shadow-sm" onClick={(e) => { e.preventDefault(); window.location.href = 'tel:+919818823106'; }}>
                            <Phone className="mr-1 h-3 w-3 shrink-0" /> Call
                        </Button>
                    </div>
                </Link>
            </div>
        </div>
    );
}
