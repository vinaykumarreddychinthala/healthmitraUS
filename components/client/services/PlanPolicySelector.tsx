'use client';

import { useState, useEffect } from 'react';
import {
    CreditCard, User, ChevronRight, Loader2, AlertCircle,
    CheckCircle, ShieldAlert, ArrowRight, RefreshCw
} from 'lucide-react';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PolicyHolder {
    kycId: string;
    holderFullName: string;
    relation: string;
    photoUrl: string | null;
    memberId: string;
    dob?: string | null;
    contactNumber?: string | null;
}

export interface PlanContext {
    memberId: string;
    planId: string;
    planName: string;
    cardUniqueId: string;
    validTill: string;
    allowedServices: string[];
    policyHolders: PolicyHolder[];
}

export interface ServiceRequestContext {
    plan: PlanContext;
    policyHolder: PolicyHolder;
}

interface PlanPolicySelectorProps {
    requestedServiceType?: string;        // pre-filter allowed plans
    onContextSelected: (ctx: ServiceRequestContext) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanPolicySelector({ requestedServiceType, onContextSelected }: PlanPolicySelectorProps) {
    const [loading, setLoading] = useState(true);
    const [plans, setPlans] = useState<PlanContext[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Step state
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedPlan, setSelectedPlan] = useState<PlanContext | null>(null);
    const [selectedHolder, setSelectedHolder] = useState<PolicyHolder | null>(null);

    // ── Fetch plans ───────────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/service-requests/context');
                const data = await res.json();
                if (!data.success) { setError(data.error || 'Failed to load plans'); return; }

                const universallyAllowed = ["companion", "bill_reimbursement", "general", "emergency"];
                
                let filtered: PlanContext[] = data.plans || [];
                if (requestedServiceType) {
                    filtered = filtered.filter(p => p.allowedServices.includes(requestedServiceType) || universallyAllowed.includes(requestedServiceType));
                }
                setPlans(filtered);

                // If no plans found, but service is universally allowed, auto-bypass
                if (filtered.length === 0 && requestedServiceType && universallyAllowed.includes(requestedServiceType)) {
                    onContextSelected({
                        plan: { memberId: 'none', planId: 'none', planName: 'General Request', cardUniqueId: 'N/A', validTill: '', allowedServices: [requestedServiceType], policyHolders: [] },
                        policyHolder: { kycId: 'none', holderFullName: 'Myself', relation: 'Self', photoUrl: null, memberId: 'none' }
                    });
                    return;
                }

                // Auto-select if single plan
                if (filtered.length === 1) {
                    setSelectedPlan(filtered[0]);
                    // Auto-select if single policy holder too
                    if (filtered[0].policyHolders.length === 1) {
                        setSelectedHolder(filtered[0].policyHolders[0]);
                        // Both auto-selected — fire callback immediately
                        onContextSelected({ plan: filtered[0], policyHolder: filtered[0].policyHolders[0] });
                        return;
                    }
                    if (filtered[0].policyHolders.length > 1) {
                        setStep(2);
                    }
                }
            } catch (e: any) {
                setError(e.message || 'Network error');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [requestedServiceType]);

    const handleSelectPlan = (plan: PlanContext) => {
        setSelectedPlan(plan);
        setSelectedHolder(null);

        if (plan.policyHolders.length === 0) {
            // Check if service is universally allowed, allow bypass of KYC
            const universallyAllowed = ["companion", "bill_reimbursement", "general", "emergency"];
            if (requestedServiceType && universallyAllowed.includes(requestedServiceType)) {
                 onContextSelected({ 
                     plan, 
                     policyHolder: { kycId: 'none', holderFullName: 'Myself', relation: 'Self', photoUrl: null, memberId: plan.memberId } 
                 });
                 return;
            }
            
            // Has plan but no KYC — stay on step 1, show gate
            return;
        }
        if (plan.policyHolders.length === 1) {
            // Auto-select single holder
            setSelectedHolder(plan.policyHolders[0]);
            onContextSelected({ plan, policyHolder: plan.policyHolders[0] });
            return;
        }
        setStep(2);
    };

    const handleSelectHolder = (holder: PolicyHolder) => {
        setSelectedHolder(holder);
        if (selectedPlan) {
            onContextSelected({ plan: selectedPlan, policyHolder: holder });
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                <p className="text-slate-500 text-sm">Loading your plans...</p>
            </div>
        );
    }

    // ── Error ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
                <p className="text-slate-700 font-medium">Failed to load plan details</p>
                <p className="text-slate-500 text-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="flex items-center gap-2 text-teal-600 hover:text-teal-700 text-sm font-medium">
                    <RefreshCw className="w-4 h-4" /> Retry
                </button>
            </div>
        );
    }

    // ── No plans ──────────────────────────────────────────────────────────────
    if (plans.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl">📋</div>
                <p className="text-slate-800 font-semibold">
                    {requestedServiceType ? 'Your plan does not cover this service' : 'No active plans found'}
                </p>
                <p className="text-slate-500 text-sm max-w-xs">
                    {requestedServiceType
                        ? `The "${requestedServiceType}" service is not included in your current plan. Upgrade to access it.`
                        : 'Purchase a plan to start using HealthMitra services.'}
                </p>
                <Link href="/shop/plans" className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
                    View Plans <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Plan Selection
    // ─────────────────────────────────────────────────────────────────────────
    if (step === 1) {
        return (
            <div className="space-y-5">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Select Plan</h2>
                    <p className="text-slate-500 text-sm mt-0.5">Choose which plan this service request is for</p>
                </div>

                <div className="space-y-3">
                    {plans.map(plan => {
                        const hasKYC = plan.policyHolders.length > 0;
                        const isSelected = selectedPlan?.memberId === plan.memberId;

                        return (
                            <button
                                key={plan.memberId}
                                onClick={() => handleSelectPlan(plan)}
                                className={`w-full text-left p-4 rounded-2xl border-2 transition-all group
                                    ${isSelected ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100' :
                                    hasKYC ? 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm' :
                                        'border-amber-200 bg-amber-50/50'}`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Plan icon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                                        ${isSelected ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-600'}`}>
                                        <CreditCard className="w-6 h-6" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-bold text-slate-800">{plan.planName}</p>
                                            <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                                                {plan.cardUniqueId}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            {plan.validTill && (
                                                <p className="text-xs text-slate-500">
                                                    Valid till: <span className="font-medium text-slate-700">
                                                        {new Date(plan.validTill).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </p>
                                            )}
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                                Active
                                            </span>
                                        </div>

                                        {/* KYC status / holder preview */}
                                        {hasKYC ? (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {plan.policyHolders.map(h => (
                                                    <span key={h.kycId} className="flex items-center gap-1 text-xs bg-white border border-teal-200 text-teal-700 px-2 py-1 rounded-lg">
                                                        <User className="w-3 h-3" />
                                                        {h.holderFullName} ({h.relation})
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                No KYC submitted — complete Policy Holder Details first
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight className={`w-5 h-5 shrink-0 mt-1 transition-all
                                        ${isSelected ? 'text-teal-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* KYC Gate: show if selected plan has no KYC */}
                {selectedPlan && selectedPlan.policyHolders.length === 0 && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl">
                        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-semibold text-amber-900 text-sm">Complete Policy Holder Details</p>
                            <p className="text-amber-700 text-xs mt-0.5">
                                Before raising a service request under <strong>{selectedPlan.planName}</strong>,
                                you must fill Policy Holder Details in the E-Card section.
                            </p>
                        </div>
                        <Link href="/e-cards"
                            className="shrink-0 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap">
                            Go to E-Cards <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Policy Holder Selection
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* Step header with back */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => { setStep(1); setSelectedHolder(null); setSelectedPlan(null); }}
                    className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
                >
                    ←
                </button>
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Select Policy Holder</h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Who is this service request for? ({selectedPlan?.planName})
                    </p>
                </div>
            </div>

            {/* Selected plan summary pill */}
            {selectedPlan && (
                <div className="flex items-center gap-2 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                    <CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-teal-800">{selectedPlan.planName}</span>
                        <span className="ml-2 text-xs text-teal-600 font-mono">{selectedPlan.cardUniqueId}</span>
                    </div>
                    <CheckCircle className="w-4 h-4 text-teal-500 shrink-0" />
                </div>
            )}

            {/* Policy holder cards */}
            <div className="space-y-3">
                {(selectedPlan?.policyHolders || []).map(holder => {
                    const isSelected = selectedHolder?.kycId === holder.kycId;
                    return (
                        <button
                            key={holder.kycId}
                            onClick={() => handleSelectHolder(holder)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all group flex items-center gap-4
                                ${isSelected
                                ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100'
                                : 'border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm'}`}
                        >
                            {/* Photo or avatar */}
                            <div className="w-14 h-14 rounded-xl shrink-0 overflow-hidden border-2 border-slate-200 bg-slate-100 flex items-center justify-center">
                                {holder.photoUrl && !holder.photoUrl.endsWith('.pdf') ? (
                                    <img src={holder.photoUrl} alt={holder.holderFullName}
                                        className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-7 h-7 text-slate-400" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-800 text-base">{holder.holderFullName}</p>
                                <span className={`mt-1 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold
                                    ${holder.relation === 'Self'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-slate-100 text-slate-600'}`}>
                                    <User className="w-3 h-3" />
                                    {holder.relation}
                                </span>
                                <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600">
                                    <CheckCircle className="w-3 h-3" /> KYC Verified
                                </div>
                            </div>

                            <ChevronRight className={`w-5 h-5 shrink-0 transition-all
                                ${isSelected ? 'text-teal-600' : 'text-slate-300 group-hover:text-slate-400'}`} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
