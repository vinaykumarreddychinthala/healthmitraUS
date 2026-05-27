'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';

interface RequestUpdate {
    id: string;
    title: string;
    requestId: string;
    previousStatus: string;
    newStatus: string;
    updatedAt: string;
    adminComment?: string;
}

interface LatestRequestPopupProps {
    updates: RequestUpdate[];
    onClose: () => void;
    onDismiss: (ids: string[]) => void;
}

export function LatestRequestPopup({ updates, onClose, onDismiss }: LatestRequestPopupProps) {
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    const handleClose = useCallback(() => {
        setIsVisible(false);
        if (dontShowAgain) {
            onDismiss(updates.map(u => u.id));
        }
        setTimeout(onClose, 300);
    }, [dontShowAgain, updates, onDismiss, onClose]);

    useEffect(() => {
        // Auto-close after 30 seconds
        const timer = setTimeout(() => {
            handleClose();
        }, 30000);
        return () => clearTimeout(timer);
    }, [handleClose]);

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            approved: 'text-emerald-600',
            completed: 'text-blue-600',
            rejected: 'text-red-600',
            pending: 'text-amber-600',
            'in_progress': 'text-purple-600',
            'under_review': 'text-indigo-600',
        };
        return colors[status.toLowerCase()] || 'text-slate-600';
    };

    if (!isVisible) return null;

    const isSingleUpdate = updates.length === 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-full">
                            <Bell className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-white">
                            {isSingleUpdate ? 'Latest Update' : `You have ${updates.length} new updates`}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {isSingleUpdate ? (
                        <p className="text-slate-600 mb-4">You have a new update on your recent request!</p>
                    ) : null}

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {updates.map((update) => (
                            <div
                                key={update.id}
                                className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">🩺</span>
                                            <h3 className="font-semibold text-slate-800 truncate">{update.title}</h3>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-2">{update.requestId}</p>

                                        <p className="text-sm text-slate-700">
                                            Status Changed: <span className="text-slate-400">{update.previousStatus}</span>
                                            <span className="mx-1">→</span>
                                            <span className={`font-semibold ${getStatusColor(update.newStatus)}`}>
                                                {update.newStatus}
                                            </span>
                                        </p>

                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                            <Clock className="h-3 w-3" />
                                            <span>Updated: {formatTimeAgo(update.updatedAt)}</span>
                                        </div>

                                        {update.adminComment && isSingleUpdate && (
                                            <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                                                <p className="text-xs font-semibold text-slate-500 mb-1">Admin Comment:</p>
                                                <p className="text-sm text-slate-700">&ldquo;{update.adminComment}&rdquo;</p>
                                            </div>
                                        )}
                                    </div>

                                    <Link
                                        href={`/service-requests/${update.id}`}
                                        className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1 flex-shrink-0"
                                    >
                                        View <ChevronRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                    {isSingleUpdate && (
                        <label className="flex items-center gap-2 text-sm text-slate-600 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            Don&apos;t show this again for this update
                        </label>
                    )}

                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        >
                            Close
                        </button>
                        <Link
                            href="/service-requests"
                            className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors flex items-center gap-2"
                        >
                            {isSingleUpdate ? 'View Request' : 'View All Requests'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LatestRequestPopup;
