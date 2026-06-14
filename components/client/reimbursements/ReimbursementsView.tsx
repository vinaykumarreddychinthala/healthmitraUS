'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, Activity, Search, Filter, X, ChevronDown, Download, CheckCircle, XCircle, Clock, RefreshCw, Wallet, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import KYCGateBanner from '@/components/client/KYCGateBanner';
import { useKYCStatus } from '@/hooks/useKYCStatus';

interface ReimbursementsViewProps {
    initialClaims: any[];
}

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'approved':
            return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1"><CheckCircle size={12} /> Approved</span>;
        case 'processing':
        case 'pending':
            return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1"><Clock size={12} /> Processing</span>;
        case 'under_review':
            return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 flex items-center gap-1"><Clock size={12} /> Under Review</span>;
        case 'rejected':
            return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1"><XCircle size={12} /> Rejected</span>;
        default:
            return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Submitted</span>;
    }
};

type StatusFilter = 'approved' | 'rejected' | 'pending' | 'under_review';

export function ReimbursementsView({ initialClaims }: ReimbursementsViewProps) {
    const claims = initialClaims || [];
    const { kycSubmitted, verifiedCount, checking } = useKYCStatus();

    const [selectedStatuses, setSelectedStatuses] = useState<StatusFilter[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const toggleStatus = (status: StatusFilter) => {
        setSelectedStatuses(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const filteredClaims = claims.filter((claim: any) => {
        if (selectedStatuses.length > 0) {
            const claimStatus = claim.status === 'processing' ? 'pending' : claim.status;
            if (!selectedStatuses.includes(claimStatus as StatusFilter)) return false;
        }
        if (typeFilter !== 'all') {
            const claimType = (claim.claim_type || claim.type || '').toLowerCase();
            if (!claimType.includes(typeFilter.toLowerCase())) return false;
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchSearch =
                claim.id.toLowerCase().includes(query) ||
                (claim.claim_type || claim.type || '').toLowerCase().includes(query) ||
                (claim.member || '').toLowerCase().includes(query) ||
                String(claim.amount).includes(query);
            if (!matchSearch) return false;
        }
        return true;
    });

    const approvedAmount = claims.filter((c: any) => c.status === 'approved').reduce((sum: number, claim: any) => sum + (claim.amount || 0), 0);
    const rejectedAmount = claims.filter((c: any) => c.status === 'rejected').reduce((sum: number, claim: any) => sum + (claim.amount || 0), 0);
    const pendingAmount = claims.filter((c: any) => c.status === 'processing' || c.status === 'pending' || c.status === 'under_review').reduce((sum: number, claim: any) => sum + (claim.amount || 0), 0);
    const pendingCount = claims.filter((c: any) => c.status === 'processing' || c.status === 'pending' || c.status === 'under_review').length;
    const approvedCount = claims.filter((c: any) => c.status === 'approved').length;
    const rejectedCount = claims.filter((c: any) => c.status === 'rejected').length;

    const statusFilters: { value: StatusFilter; label: string; count: number; color: string }[] = [
        { value: 'approved', label: 'Approved', count: approvedCount, color: 'emerald' },
        { value: 'rejected', label: 'Rejected', count: rejectedCount, color: 'red' },
        { value: 'pending', label: 'Pending', count: pendingCount, color: 'amber' },
        { value: 'under_review', label: 'Under Review', count: claims.filter((c: any) => c.status === 'under_review').length, color: 'blue' },
    ];

    const claimTypes = ['all', 'Medicine', 'Diagnostic Test', 'OPD Consultation', 'Hospitalization'];

    const handleReset = () => {
        setSelectedStatuses([]);
        setSearchQuery('');
        setTypeFilter('all');
    };

    const handleResubmit = (claimId: string) => {
        toast.info('Resubmit Claim', {
            description: `You can resubmit ${claimId} with corrected documents.`
        });
    };

    const handleDownloadReceipt = async (claimId: string) => {
        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'reimbursement_receipt',
                    data: { claimId }
                }),
            });

            const result = await response.json();

            if (result.success) {
                const blob = new Blob([result.data.content], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.data.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success('Receipt downloaded');
            } else {
                toast.error(result.error || 'Download failed');
            }
        } catch (error) {
            toast.error('Something went wrong');
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* KYC Gate Banner */}
            {!checking && kycSubmitted === false && (
                <KYCGateBanner context="service" />
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Reimbursements</h1>
                    <p className="text-slate-500">Track and manage your insurance claims</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-emerald-100 font-medium text-sm">Approved Amount</p>
                        <h3 className="text-3xl font-bold mt-1">${approvedAmount.toLocaleString('en-IN')}</h3>
                        <p className="text-xs text-emerald-200 mt-2 bg-white/10 inline-block px-2 py-1 rounded">{approvedCount} Claims approved</p>
                    </div>
                    <Activity className="absolute bottom-[-10px] right-[-10px] w-24 h-24 text-white opacity-10" />
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-red-100 font-medium text-sm">Rejected Amount</p>
                        <h3 className="text-3xl font-bold mt-1">${rejectedAmount.toLocaleString('en-IN')}</h3>
                        <p className="text-xs text-red-200 mt-2 bg-white/10 inline-block px-2 py-1 rounded">{rejectedCount} Claims rejected</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 text-sm font-medium">Pending Processing</p>
                            <h3 className="text-2xl font-bold text-slate-800 mt-1">${pendingAmount.toLocaleString('en-IN')}</h3>
                            <p className="text-xs text-amber-600 mt-1">{pendingCount} claims in review</p>
                        </div>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 space-y-4">
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by ID, member, amount..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {claimTypes.map(type => (
                                <option key={type} value={type}>{type === 'all' ? 'Type: All' : type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <span className="text-sm font-medium text-slate-600">Filter by Status:</span>
                        {statusFilters.map(filter => (
                            <label key={filter.value} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedStatuses.includes(filter.value)}
                                    onChange={() => toggleStatus(filter.value)}
                                    className={`w-4 h-4 rounded border-2 focus:ring-2 focus:ring-offset-1 transition-all
                                        ${filter.color === 'emerald' ? 'text-emerald-600 focus:ring-emerald-500 border-emerald-300' : ''}
                                        ${filter.color === 'red' ? 'text-red-600 focus:ring-red-500 border-red-300' : ''}
                                        ${filter.color === 'amber' ? 'text-amber-600 focus:ring-amber-500 border-amber-300' : ''}
                                        ${filter.color === 'blue' ? 'text-blue-600 focus:ring-blue-500 border-blue-300' : ''}
                                    `}
                                />
                                <span className={`text-sm font-medium transition-colors
                                    ${selectedStatuses.includes(filter.value)
                                        ? filter.color === 'emerald' ? 'text-emerald-700'
                                            : filter.color === 'red' ? 'text-red-700'
                                                : filter.color === 'amber' ? 'text-amber-700'
                                                    : 'text-blue-700'
                                        : 'text-slate-600 group-hover:text-slate-800'
                                    }`}>
                                    {filter.label} ({filter.count})
                                </span>
                            </label>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {(selectedStatuses.length > 0 || searchQuery || typeFilter !== 'all') && (
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                <X size={14} /> Reset Filters
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                    Showing {filteredClaims.length} of {claims.length} claims
                </div>

                <div className="p-4 space-y-4">
                    {filteredClaims.length === 0 ? (
                        <div className="py-12 text-center">
                            <div className="text-6xl mb-3">📋</div>
                            <p className="text-slate-600 font-medium">No claims found</p>
                            <p className="text-slate-400 text-sm mt-1">
                                {selectedStatuses.length > 0
                                    ? `No claims matching selected filters`
                                    : 'You have not submitted any claims yet'}
                            </p>
                        </div>
                    ) : (
                        filteredClaims.map((claim: any) => (
                            <div
                                key={claim.id}
                                className={`p-4 rounded-xl border transition-all hover:shadow-md ${claim.status === 'approved' ? 'bg-emerald-50/50 border-emerald-200' :
                                    claim.status === 'rejected' ? 'bg-red-50/50 border-red-200' :
                                        'bg-white border-slate-200'
                                    }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${claim.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                            claim.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                'bg-amber-100 text-amber-600'
                                            }`}>
                                            {claim.claim_type === 'Medicine' ? '💊' :
                                                claim.claim_type === 'Diagnostic Test' ? '🧪' :
                                                    claim.claim_type === 'OPD Consultation' ? '👨‍⚕️' :
                                                        claim.claim_type === 'Hospitalization' ? '🏥' : '📄'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-semibold text-slate-800">{claim.claim_type}</h4>
                                                <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{claim.id}</span>
                                                <StatusBadge status={claim.status} />
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {new Date(claim.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                {claim.member && <span> • {claim.member}</span>}
                                            </p>

                                            {claim.status === 'approved' && claim.creditedToWallet && (
                                                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                                    <Wallet size={12} /> Credited to wallet
                                                </p>
                                            )}

                                            {claim.status === 'rejected' && claim.rejectionReason && (
                                                <div className="mt-2 p-2 bg-red-100/50 rounded-lg">
                                                    <p className="text-xs text-red-700 flex items-start gap-1">
                                                        <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                                                        <span><strong>Rejection Reason:</strong> &quot;{claim.rejectionReason}&quot;</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`text-xl font-bold ${claim.status === 'approved' ? 'text-emerald-600' :
                                                claim.status === 'rejected' ? 'text-red-600' :
                                                    'text-slate-800'
                                                }`}>
                                                ${claim.amount?.toLocaleString('en-IN')}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                                                View Details
                                            </button>
                                            {claim.status === 'approved' && (
                                                <button
                                                    onClick={() => handleDownloadReceipt(claim.id)}
                                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <Download size={14} /> Receipt
                                                </button>
                                            )}
                                            {claim.status === 'rejected' && (
                                                <button
                                                    onClick={() => handleResubmit(claim.id)}
                                                    className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <RefreshCw size={14} /> Resubmit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
