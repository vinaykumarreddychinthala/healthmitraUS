'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, CheckCircle2, XCircle, Clock, Edit3, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface KYCEditRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
}

interface EditRequest {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    admin_note: string | null;
    created_at: string;
    resolved_at: string | null;
}

export default function KYCEditRequestModal({
    isOpen, onClose, memberId, memberName
}: KYCEditRequestModalProps) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [existingRequests, setExistingRequests] = useState<EditRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    const latestRequest = existingRequests[0] || null;
    const hasPendingRequest = latestRequest?.status === 'pending';

    useEffect(() => {
        if (!isOpen || !memberId) return;
        const fetchRequests = async () => {
            setLoadingRequests(true);
            try {
                const res = await fetch(`/api/kyc/edit-request?memberId=${memberId}`);
                const data = await res.json();
                if (data.success) setExistingRequests(data.data || []);
            } catch {
                // silent
            } finally {
                setLoadingRequests(false);
            }
        };
        fetchRequests();
    }, [isOpen, memberId]);

    const handleSubmit = async () => {
        if (!reason.trim() || reason.trim().length < 10) {
            toast.error('Please provide a reason (at least 10 characters)');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/kyc/edit-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ memberId, reason: reason.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Edit request submitted!', {
                    description: 'Admin will review and update your details shortly.',
                });
                setReason('');
                onClose();
            } else {
                toast.error(data.error || 'Failed to submit request. Please try again.');
            }
        } catch {
            toast.error('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const statusConfig = {
        pending: {
            icon: <Clock className="w-4 h-4" />,
            label: 'Pending Review',
            classes: 'bg-amber-50 border-amber-200 text-amber-700',
            badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
        },
        approved: {
            icon: <CheckCircle2 className="w-4 h-4" />,
            label: 'Approved',
            classes: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        },
        rejected: {
            icon: <XCircle className="w-4 h-4" />,
            label: 'Rejected',
            classes: 'bg-red-50 border-red-200 text-red-700',
            badgeClass: 'bg-red-100 text-red-700 border-red-200',
        },
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white max-w-md w-full p-0 overflow-hidden gap-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                        <Edit3 className="w-5 h-5" /> Request Edit
                    </DialogTitle>
                    <p className="text-amber-100 text-sm mt-1">
                        Request changes to KYC details for <strong>{memberName}</strong>
                    </p>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Existing request history */}
                    {loadingRequests ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        </div>
                    ) : existingRequests.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Request History</p>
                            {existingRequests.slice(0, 3).map((req) => {
                                const cfg = statusConfig[req.status];
                                return (
                                    <div
                                        key={req.id}
                                        className={`rounded-xl border p-3.5 ${cfg.classes}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badgeClass}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                            <span className="text-xs opacity-70">
                                                {new Date(req.created_at).toLocaleDateString('en-IN')}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium mb-1">Your reason:</p>
                                        <p className="text-sm opacity-80">{req.reason}</p>
                                        {req.admin_note && (
                                            <div className="mt-2 pt-2 border-t border-current/20">
                                                <p className="text-xs font-semibold">Admin Note:</p>
                                                <p className="text-sm mt-0.5">{req.admin_note}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pending request block */}
                    {hasPendingRequest ? (
                        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-bold">Request Already Pending</p>
                                <p className="mt-1">You already have a pending edit request. Please wait for admin to review it before submitting a new one.</p>
                            </div>
                        </div>
                    ) : (
                        /* New request form */
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Edit Request</p>
                            <div className="space-y-2">
                                <Label htmlFor="edit-reason" className="text-slate-700 font-medium">
                                    Reason for Edit <span className="text-red-500">*</span>
                                </Label>
                                <Textarea
                                    id="edit-reason"
                                    placeholder="Describe what needs to be changed and why (e.g., 'My Aadhaar number was entered incorrectly. The correct number is...')"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    rows={4}
                                    className="resize-none"
                                    maxLength={500}
                                />
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>Be specific about what needs to change</span>
                                    <span>{reason.length}/500</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Once submitted, admin will review your request and update your details. You'll be notified of the decision.</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    {!hasPendingRequest && (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting || reason.trim().length < 10}
                            className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                        >
                            {submitting
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                                : <><Send className="w-4 h-4" /> Submit Request</>
                            }
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
