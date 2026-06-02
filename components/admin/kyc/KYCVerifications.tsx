"use client";

import { useState, useEffect, useCallback } from 'react';
import { getKYCVerifications, verifyInitialKYC, rejectInitialKYC } from '@/app/actions/kyc-admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle, Clock, Eye, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_CONFIG = {
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    verified: { label: 'Verified', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

export default function KYCVerifications() {
    const [verifications, setVerifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [totalCount, setTotalCount] = useState(0);

    // Review Modal
    const [reviewModal, setReviewModal] = useState<{ open: boolean; request: any | null }>({ open: false, request: null });
    const [verifying, setVerifying] = useState(false);

    // Reject Flow inside Review Modal
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectNote, setRejectNote] = useState('');
    const [rejectingSubmit, setRejectingSubmit] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getKYCVerifications({ status: statusFilter });
            if (res.success) {
                setVerifications(res.data);
                setTotalCount(res.totalCount);
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleVerify = async (memberId: string) => {
        setVerifying(true);
        try {
            const res = await verifyInitialKYC(memberId);
            if (res.success) {
                toast.success('KYC Verified successfully!');
                setReviewModal({ open: false, request: null });
                load();
            } else {
                toast.error(res.error || 'Failed to verify');
            }
        } finally {
            setVerifying(false);
        }
    };

    const handleReject = async (memberId: string) => {
        if (!rejectNote.trim()) {
            toast.error('Please provide a reason for rejection.');
            return;
        }
        setRejectingSubmit(true);
        try {
            const res = await rejectInitialKYC(memberId, rejectNote);
            if (res.success) {
                toast.success('KYC Rejected. Customer must resubmit.');
                setIsRejecting(false);
                setRejectNote('');
                setReviewModal({ open: false, request: null });
                load();
            } else {
                toast.error(res.error || 'Failed to reject');
            }
        } finally {
            setRejectingSubmit(false);
        }
    };

    const pendingCount = verifications.filter(v => v.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {(['pending', 'verified', 'rejected'] as const).map(s => {
                    const cfg = STATUS_CONFIG[s];
                    const Icon = cfg.icon;
                    return (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-3 transition-all hover:shadow-md text-left
                                ${statusFilter === s ? 'border-teal-300 ring-2 ring-teal-100' : 'border-slate-100'}`}
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                                <Icon className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 capitalize">{s}</p>
                                <p className="text-xl font-bold text-slate-800">
                                    {loading ? '—' : verifications.filter(v => v.status === s).length}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Filter bar */}
            <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-44 bg-white border-slate-200">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Verifications</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={load} className="gap-2">
                    <Loader2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </Button>
                <span className="text-sm text-slate-400 ml-auto">{totalCount} total</span>
            </div>

            {/* Table */}
            <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="border-slate-200 hover:bg-transparent">
                                <TableHead className="text-slate-700">Customer</TableHead>
                                <TableHead className="text-slate-700">Member</TableHead>
                                <TableHead className="text-slate-700">Documents</TableHead>
                                <TableHead className="text-slate-700">Submitted</TableHead>
                                <TableHead className="text-slate-700">Status</TableHead>
                                <TableHead className="text-right text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <Loader2 className="h-7 w-7 animate-spin mx-auto text-teal-500 mb-2" />
                                        <p className="text-slate-400 text-sm">Loading verifications...</p>
                                    </TableCell>
                                </TableRow>
                            ) : verifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <ShieldCheck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                        <p className="text-slate-400 text-sm">No {statusFilter} verifications</p>
                                    </TableCell>
                                </TableRow>
                            ) : verifications.map(req => {
                                const cfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                                const StatusIcon = cfg.icon;
                                return (
                                    <TableRow key={req.id} className="border-slate-100 hover:bg-slate-50">
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-slate-900 text-sm">{req.customerName}</p>
                                                <p className="text-xs text-slate-500">{req.customerEmail}</p>
                                                <Link href={`/admin/users/${req.userId}`} className="text-xs text-teal-600 hover:underline">
                                                    View Profile →
                                                </Link>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{req.memberName}</p>
                                                <Badge variant="outline" className="text-[10px] mt-0.5">
                                                    {req.memberRelation}
                                                </Badge>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">{req.cardId}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {req.photoUrl && <Badge variant="secondary" className="text-[10px]"><ImageIcon className="w-3 h-3 mr-1" /> Photo</Badge>}
                                                {(req.aadhaarFileUrl || req.aadhaarNumber) && <Badge variant="secondary" className="text-[10px]"><FileText className="w-3 h-3 mr-1" /> Aadhaar</Badge>}
                                                {(req.panFileUrl || req.panNumber) && <Badge variant="secondary" className="text-[10px]"><FileText className="w-3 h-3 mr-1" /> PAN</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-xs text-slate-600">
                                                {new Date(req.submittedAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit border ${cfg.cls}`}>
                                                <StatusIcon className="w-3 h-3" /> {cfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => setReviewModal({ open: true, request: req })}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs gap-1"
                                            >
                                                <Eye className="w-3.5 h-3.5" /> Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Review Modal */}
            <Dialog open={reviewModal.open} onOpenChange={o => {
                if (!o) {
                    setIsRejecting(false);
                    setRejectNote('');
                }
                setReviewModal(prev => ({ ...prev, open: o }));
            }}>
                <DialogContent className="bg-white border-slate-200 max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-teal-600" /> Review KYC Submission
                        </DialogTitle>
                    </DialogHeader>

                    {reviewModal.request && (
                        <div className="space-y-6 py-4">
                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">Customer</p>
                                    <p className="text-sm font-semibold text-slate-900">{reviewModal.request.customerName}</p>
                                    <p className="text-xs text-slate-600">{reviewModal.request.customerEmail}</p>
                                    <p className="text-xs text-slate-600">{reviewModal.request.customerPhone}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium">E-Card Member</p>
                                    <p className="text-sm font-semibold text-slate-900">{reviewModal.request.memberName}</p>
                                    <p className="text-xs text-slate-600">Relation: {reviewModal.request.memberRelation}</p>
                                    <p className="text-xs text-slate-600 font-mono">Card ID: {reviewModal.request.cardId}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">Submitted Documents</h4>
                                
                                {/* Photo */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <p className="text-xs font-medium text-slate-500 mb-2">Passport Photo</p>
                                        {reviewModal.request.photoUrl ? (
                                            <div className="aspect-square w-full max-w-[150px] relative rounded-lg overflow-hidden border">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={reviewModal.request.photoUrl} alt="Photo" className="object-cover w-full h-full" />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-red-500 italic">Not provided</p>
                                        )}
                                    </div>
                                    <div className="col-span-2 space-y-4">
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 mb-1">Aadhaar Details</p>
                                            {reviewModal.request.aadhaarDeclaration ? (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Self Declared (Under 18)</Badge>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-mono bg-slate-100 px-2 py-1 rounded inline-block mb-2">
                                                        {reviewModal.request.aadhaarNumber || 'No Number'}
                                                    </p>
                                                    {reviewModal.request.aadhaarFileUrl ? (
                                                        <a href={reviewModal.request.aadhaarFileUrl} target="_blank" rel="noreferrer" className="block text-xs text-teal-600 hover:underline">
                                                            📄 View Aadhaar Document
                                                        </a>
                                                    ) : <p className="text-xs text-red-500 italic">No document file</p>}
                                                </>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-slate-500 mb-1">PAN Details</p>
                                            {reviewModal.request.panDeclaration ? (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Self Declared (Under 18)</Badge>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-mono bg-slate-100 px-2 py-1 rounded inline-block mb-2">
                                                        {reviewModal.request.panNumber || 'No Number'}
                                                    </p>
                                                    {reviewModal.request.panFileUrl ? (
                                                        <a href={reviewModal.request.panFileUrl} target="_blank" rel="noreferrer" className="block text-xs text-teal-600 hover:underline">
                                                            📄 View PAN Document
                                                        </a>
                                                    ) : <p className="text-xs text-red-500 italic">No document file</p>}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {reviewModal.request.status === 'pending' && (
                                <div className="border-t pt-4 mt-6">
                                    {!isRejecting ? (
                                        <div className="flex justify-end gap-3">
                                            <Button 
                                                variant="outline" 
                                                className="border-red-200 text-red-600 hover:bg-red-50"
                                                onClick={() => setIsRejecting(true)}
                                            >
                                                Reject...
                                            </Button>
                                            <Button 
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                                onClick={() => handleVerify(reviewModal.request.memberId)}
                                                disabled={verifying}
                                            >
                                                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                Approve & Verify
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 bg-red-50 p-4 rounded-xl border border-red-100 animate-in fade-in slide-in-from-top-4">
                                            <Label className="text-red-800">Reason for Rejection (Customer will see this)</Label>
                                            <Textarea 
                                                placeholder="e.g. Aadhaar image is blurry. Please re-upload a clear image."
                                                value={rejectNote}
                                                onChange={e => setRejectNote(e.target.value)}
                                                className="bg-white border-red-200 focus-visible:ring-red-500"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" onClick={() => setIsRejecting(false)}>Cancel</Button>
                                                <Button 
                                                    variant="destructive"
                                                    onClick={() => handleReject(reviewModal.request.memberId)}
                                                    disabled={rejectingSubmit || !rejectNote.trim()}
                                                >
                                                    {rejectingSubmit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                    Confirm Reject
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
