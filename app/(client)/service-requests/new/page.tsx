'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, User, CheckCircle, Edit2 } from 'lucide-react';
import PlanPolicySelector, { ServiceRequestContext } from '@/components/client/services/PlanPolicySelector';
import { ServiceRequestForm } from '@/components/client/ServiceRequestForm';
import Link from 'next/link';

function NewServiceRequestContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeFromUrl = searchParams.get('type') || '';

    // Wizard state: null = selector not done; filled = context chosen
    const [context, setContext] = useState<ServiceRequestContext | null>(null);

    const handleContextSelected = (ctx: ServiceRequestContext) => {
        setContext(ctx);
    };

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-6 animate-in fade-in-50">
            {/* Back button */}
            <button
                onClick={() => router.push('/service-requests')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Services
            </button>

            {/* Context Selection Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-5 text-white">
                    <h1 className="text-xl font-bold">New Service Request</h1>
                    <p className="text-teal-100 text-sm mt-0.5">
                        Select your plan and policy holder before choosing a service
                    </p>
                </div>

                {/* Progress steps */}
                <div className="flex items-center gap-0 border-b border-slate-100">
                    {[
                        { step: 1, label: 'Plan & Member', icon: CreditCard },
                        { step: 2, label: 'Service Details', icon: User },
                    ].map((s, idx) => {
                        const done = context !== null && s.step === 1;
                        const active = (context === null && s.step === 1) || (context !== null && s.step === 2);
                        return (
                            <div key={s.step} className={`flex-1 flex items-center gap-2.5 px-6 py-4 text-sm font-medium transition-colors
                                ${active ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600' :
                                done ? 'text-emerald-600 bg-emerald-50/40' : 'text-slate-400'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                                    ${active ? 'bg-teal-600 text-white' :
                                    done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                    {done ? <CheckCircle className="w-4 h-4" /> : s.step}
                                </div>
                                <span className="hidden sm:block">{s.label}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="p-6">
                    {/* STEP 1: Plan + Policy Holder selection */}
                    {!context && (
                        <div className="space-y-6">
                            <PlanPolicySelector
                                requestedServiceType={typeFromUrl || undefined}
                                onContextSelected={handleContextSelected}
                            />
                            <div className="text-center pt-4 border-t border-slate-100 mt-6">
                                <span className="text-slate-500 text-sm">Need help with something else? </span>
                                <button
                                    onClick={() => handleContextSelected({
                                        plan: { memberId: 'none', planId: 'none', planName: 'General Request', cardUniqueId: 'N/A', validTill: '', allowedServices: ['general'], policyHolders: [] },
                                        policyHolder: { kycId: 'none', holderFullName: 'Myself', relation: 'Self', photoUrl: null, memberId: 'none' }
                                    })}
                                    className="text-teal-600 hover:text-teal-700 text-sm font-semibold hover:underline"
                                >
                                    Submit a General Service Request
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Service form (after context selected) */}
                    {context && (
                        <div className="space-y-5">
                            {/* Context summary — locked, with edit option */}
                            <div className="flex items-center justify-between p-4 bg-teal-50 border border-teal-200 rounded-2xl">
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span className="text-sm font-bold text-teal-900">{context.plan.planName}</span>
                                        <span className="text-xs font-mono text-teal-600 bg-white/80 px-2 py-0.5 rounded">
                                            {context.plan.cardUniqueId}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-teal-600 shrink-0" />
                                        <span className="text-sm text-teal-800">
                                            <strong>{context.policyHolder.holderFullName}</strong>
                                            <span className="text-teal-600 ml-1.5 font-normal">
                                                ({context.policyHolder.relation})
                                            </span>
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setContext(null)}
                                    className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-medium px-3 py-1.5 bg-white rounded-xl border border-teal-200 hover:border-teal-400 transition-all"
                                >
                                    <Edit2 className="w-3.5 h-3.5" /> Change
                                </button>
                            </div>

                            {/* The actual service request form */}
                            <ServiceRequestForm
                                userProfile={{}}
                                allowedServices={context.plan.allowedServices}
                                initialType={typeFromUrl || undefined}
                                serviceContext={context}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function NewServiceRequestPage() {
    return (
        <Suspense fallback={
            <div className="max-w-2xl mx-auto py-6 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        }>
            <NewServiceRequestContent />
        </Suspense>
    );
}
