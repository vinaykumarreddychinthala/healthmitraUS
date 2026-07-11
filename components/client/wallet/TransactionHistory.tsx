'use client';

import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Search, ExternalLink, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Transaction {
    id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    status: 'success' | 'pending' | 'failed';
    created_at?: string;
    transaction_date?: string;
    stripe_payment_intent_id?: string;
    reference_id?: string;
    payment_method?: string;
}

interface TransactionHistoryProps {
    transactions?: Transaction[];
}

const PAGE_SIZE = 10;

function formatDate(dateStr?: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'success') {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">
                <CheckCircle2 size={9} /> Success
            </span>
        );
    }
    if (status === 'pending') {
        return (
            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
                <Clock size={9} /> Pending
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">
            <XCircle size={9} /> Failed
        </span>
    );
}

export default function TransactionHistory({ transactions = [] }: TransactionHistoryProps) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'credit' | 'debit'>('all');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const filtered = transactions.filter((txn) => {
        const matchType = filter === 'all' || txn.type === filter;
        const matchSearch = !search || txn.description?.toLowerCase().includes(search.toLowerCase())
            || txn.reference_id?.toLowerCase().includes(search.toLowerCase())
            || txn.stripe_payment_intent_id?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
    });

    const visible = filtered.slice(0, visibleCount);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                    <h3 className="font-bold text-slate-800 text-base">Transaction History</h3>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Search */}
                        <div className="relative flex-1 sm:w-44">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search…"
                                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>

                        {/* Type filter */}
                        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden text-xs">
                            {(['all', 'credit', 'debit'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-2.5 py-1.5 font-semibold capitalize transition-colors ${
                                        filter === f
                                            ? 'bg-teal-600 text-white'
                                            : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-100">
                {visible.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ArrowDownLeft size={20} className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">No transactions yet</p>
                        <p className="text-slate-400 text-xs mt-1">Add money to your wallet to get started</p>
                    </div>
                ) : (
                    visible.map((txn) => {
                        const date = formatDate(txn.created_at || txn.transaction_date);
                        const refId = txn.stripe_payment_intent_id || txn.reference_id;

                        return (
                            <div key={txn.id} className="p-4 hover:bg-slate-50/60 transition-colors flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        txn.type === 'credit'
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-red-50 text-red-500'
                                    }`}>
                                        {txn.type === 'credit'
                                            ? <ArrowDownLeft size={18} />
                                            : <ArrowUpRight size={18} />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm leading-tight">
                                            {txn.description || (txn.type === 'credit' ? 'Wallet Credit' : 'Wallet Debit')}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-xs text-slate-400">{date}</span>
                                            <StatusBadge status={txn.status} />
                                            {txn.payment_method && txn.type === 'credit' && (
                                                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full font-semibold capitalize">
                                                    {txn.payment_method}
                                                </span>
                                            )}
                                        </div>
                                        {refId && (
                                            <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                                {refId.slice(0, 24)}{refId.length > 24 ? '…' : ''}
                                                <ExternalLink size={9} className="text-slate-300" />
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Amount */}
                                <div className={`font-bold text-base shrink-0 ${
                                    txn.type === 'credit' ? 'text-emerald-600' : 'text-slate-700'
                                }`}>
                                    {txn.type === 'credit' ? '+' : '−'}${Number(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} transactions</span>
                    <div className="flex gap-2">
                        {visibleCount < filtered.length && (
                            <button
                                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                                className="flex items-center gap-1 font-semibold text-teal-600 hover:text-teal-700"
                            >
                                Load more <ChevronDown size={14} />
                            </button>
                        )}
                        {visibleCount > PAGE_SIZE && (
                            <button
                                onClick={() => setVisibleCount(PAGE_SIZE)}
                                className="flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-700"
                            >
                                Collapse <ChevronUp size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
