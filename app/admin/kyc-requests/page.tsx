'use client';

import { useState } from 'react';
import KYCEditRequests from '@/components/admin/kyc/KYCEditRequests';
import KYCVerifications from '@/components/admin/kyc/KYCVerifications';
import { ShieldCheck, Edit3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function KYCRequestsPage() {
    const [activeTab, setActiveTab] = useState<'verifications' | 'edits'>('verifications');

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        E-Cards KYC Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Review new KYC submissions and manage customer requests to update their locked details.
                    </p>
                </div>
            </div>

            {/* Custom Tab Switcher */}
            <div className="flex bg-white rounded-xl p-1 border shadow-sm w-max">
                <button
                    onClick={() => setActiveTab('verifications')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300",
                        activeTab === 'verifications'
                            ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-200"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    )}
                >
                    <ShieldCheck className="w-4 h-4" />
                    New Verifications
                </button>
                <button
                    onClick={() => setActiveTab('edits')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300",
                        activeTab === 'edits'
                            ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-200"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    )}
                >
                    <Edit3 className="w-4 h-4" />
                    Edit Requests
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'verifications' ? <KYCVerifications /> : <KYCEditRequests />}
            </div>
        </div>
    );
}
