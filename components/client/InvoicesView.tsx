'use client';

import React, { useState } from 'react';
import { Search, Download, FileText, Receipt, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InvoicesViewProps {
    invoices: any[];
}

export function InvoicesView({ invoices }: InvoicesViewProps) {
    const [downloading, setDownloading] = useState<string | null>(null);

    const handleDownload = async (invoiceId: string, type: 'invoice' | 'receipt' | 'tax') => {
        setDownloading(invoiceId);
        
        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    data: { purchaseId: invoiceId }
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Download the file
                const blob = new Blob([result.data.content], { 
                    type: result.data.type === 'html' ? 'text/html' : 'text/plain' 
                });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.data.filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success('Download started');
            } else {
                toast.error(result.error || 'Download failed');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setDownloading(null);
        }
    };
    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Invoice Details</h1>
                    <p className="text-slate-500 text-sm">View and download all your plan purchase invoices</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 min-w-[120px]">
                    <option>Year: 2025</option>
                    <option>Year: 2024</option>
                    <option>Year: 2023</option>
                </select>
                <select className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 min-w-[120px]">
                    <option>Sort: Recent</option>
                    <option>Sort: Oldest</option>
                </select>
            </div>

            {/* Invoice List */}
            <div className="space-y-4">
                {invoices.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">No invoices found.</div>
                ) : (
                    invoices.map((inv) => (
                        <div key={inv.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start gap-6">

                                {/* Left: Invoice Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">{inv.plan_name || 'Health Plan'} - PURCHASE INVOICE</h3>
                                            <p className="text-xs text-slate-500">Invoice ID: <span className="font-mono text-slate-700 font-medium">{inv.invoice_number}</span> • {new Date(inv.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-4 text-sm ml-12">
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Plan Details</p>
                                            <p className="font-medium text-slate-800">{inv.plan_name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{inv.plan_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs mb-1">Transaction</p>
                                            <p className="font-medium text-slate-800">{inv.payment_method}</p>
                                            <p className="text-xs text-slate-400 font-mono">{inv.transaction_id}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Amount */}
                                <div className="md:w-64 bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-slate-500">Plan Amount</span>
                                        <span className="text-slate-700">${inv.amount.toLocaleString('en-US')}</span>
                                    </div>
                                    {/* GST Row Removed for US Localization */}
                                    <div className="flex justify-between pt-2 border-t border-slate-200 font-bold">
                                        <span className="text-slate-800">Total Amount</span>
                                        <span className="text-slate-800">${inv.total.toLocaleString('en-US')}</span>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600 justify-end">
                                        <ShieldCheck size={14} /> Payment Successful
                                    </div>
                                </div>

                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100 justify-end">
                                <button 
                                    onClick={() => handleDownload(inv.id, 'receipt')}
                                    disabled={downloading === inv.id}
                                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    {downloading === inv.id ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />} 
                                    Payment Receipt
                                </button>
                                {/* Tax Receipt Removed for US Localization */}
                                <button 
                                    onClick={() => handleDownload(inv.id, 'invoice')}
                                    disabled={downloading === inv.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {downloading === inv.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} 
                                    Download Invoice
                                </button>
                            </div>
                        </div>
                    )))}
            </div>
        </div>
    );
}
