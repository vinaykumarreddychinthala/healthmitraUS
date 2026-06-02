"use client";

import { useState, useEffect, useCallback } from 'react';
import { getKYCEditRequests, approveKYCEditRequest, rejectKYCEditRequest, adminUpdateKYCDetails } from '@/app/actions/kyc-admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { ShieldCheck, ShieldAlert, Loader2, CheckCircle2, XCircle, Clock, Edit3, Eye } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

const STATUS_CONFIG = {
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

const RELATIONS = ['Self', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Other'];

export default function KYCEditRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [totalCount, setTotalCount] = useState(0);

    // Reject modal
    const [rejectModal, setRejectModal] = useState<{ open: boolean; requestId: string; customerName: string }>({
        open: false, requestId: '', customerName: ''
    });
    const [rejectNote, setRejectNote] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Edit KYC modal (after approval)
    const [editModal, setEditModal] = useState<{ open: boolean; request: any | null }>({ open: false, request: null });
    const [editForm, setEditForm] = useState({ holderFullName: '', relation: '', aadhaarNumber: '', panNumber: '', adminNote: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getKYCEditRequests({ status: statusFilter });
            if (res.success) {
                setRequests(res.data);
                setTotalCount(res.totalCount);
            }
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { load(); }, [load]);

    const handleApprove = async (req: any) => {
        const res = await approveKYCEditRequest(req.id);
        if (res.success) {
            toast.success('Request approved. You can now edit the KYC details.');
            // Refresh and open edit modal
            setEditForm({
                holderFullName: '',
                relation: '',
                aadhaarNumber: '',
                panNumber: '',
                adminNote: `Approved edit request — reason: ${req.reason}`,
            });
            setEditModal({ open: true, request: req });
            load();
        } else {
            toast.error(res.error || 'Failed to approve request');
        }
    };

    const handleReject = async () => {
        setRejecting(true);
        try {
            const res = await rejectKYCEditRequest(rejectModal.requestId, rejectNote);
            if (res.success) {
                toast.success('Request rejected.');
                setRejectModal({ open: false, requestId: '', customerName: '' });
                setRejectNote('');
                load();
            } else {
                toast.error(res.error || 'Failed to reject');
            }
        } finally {
            setRejecting(false);
        }
    };

    const handleSaveKYCEdit = async () => {
        if (!editModal.request) return;
        setSaving(true);
        try {
            const res = await adminUpdateKYCDetails(editModal.request.memberId, {
                holderFullName: editForm.holderFullName || undefined,
                relation: editForm.relation || undefined,
                aadhaarNumber: editForm.aadhaarNumber || undefined,
                panNumber: editForm.panNumber || undefined,
                adminNote: editForm.adminNote || undefined,
            });
            if (res.success) {
                toast.success('KYC details updated successfully!');
                setEditModal({ open: false, request: null });
                load();
            } else {
                toast.error(res.error || 'Failed to update KYC');
            }
        } finally {
            setSaving(false);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Header info moved to parent */}
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {(['pending', 'approved', 'rejected'] as const).map(s => {
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
                                    {loading ? '—' : requests.filter(r => r.status === s).length}
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
                        <SelectItem value="all">All Requests</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
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
                                <TableHead className="text-slate-700">Reason</TableHead>
                                <TableHead className="text-slate-700">Date</TableHead>
                                <TableHead className="text-slate-700">Status</TableHead>
                                <TableHead className="text-right text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <Loader2 className="h-7 w-7 animate-spin mx-auto text-teal-500 mb-2" />
                                        <p className="text-slate-400 text-sm">Loading requests...</p>
                                    </TableCell>
                                </TableRow>
                            ) : requests.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-40 text-center">
                                        <ShieldCheck className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                        <p className="text-slate-400 text-sm">No {statusFilter} requests</p>
                                    </TableCell>
                                </TableRow>
                            ) : requests.map(req => {
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
                                        <TableCell className="max-w-xs">
                                            <p className="text-sm text-slate-700 line-clamp-2">{req.reason}</p>
                                            {req.adminNote && (
                                                <p className="text-xs text-slate-400 mt-1 italic">Note: {req.adminNote}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <p className="text-xs text-slate-600">
                                                {new Date(req.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                            {req.resolvedAt && (
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    Resolved {new Date(req.resolvedAt).toLocaleDateString('en-IN')}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit border ${cfg.cls}`}>
                                                <StatusIcon className="w-3 h-3" /> {cfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {req.status === 'pending' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(req)}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setRejectModal({ open: true, requestId: req.id, customerName: req.customerName })}
                                                        className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs gap-1"
                                                    >
                                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Link href={`/admin/users/${req.userId}`}>
                                                    <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-slate-500">
                                                        <Eye className="w-3.5 h-3.5" /> View User
                                                    </Button>
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Reject Modal */}
            <Dialog open={rejectModal.open} onOpenChange={o => setRejectModal(prev => ({ ...prev, open: o }))}>
                <DialogContent className="bg-white border-slate-200 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-red-500" /> Reject Edit Request
                        </DialogTitle>
                        <p className="text-sm text-slate-500">
                            Rejecting request from <strong>{rejectModal.customerName}</strong>. Optionally add a note explaining why.
                        </p>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Label>Admin Note (optional)</Label>
                        <Textarea
                            placeholder="e.g. The details on file are correct. Please contact support for verification..."
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectModal({ open: false, requestId: '', customerName: '' })}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleReject}
                            disabled={rejecting}
                            className="bg-red-600 hover:bg-red-700 text-white gap-2"
                        >
                            {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                            Confirm Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit KYC Modal (after approval) */}
            <Dialog open={editModal.open} onOpenChange={o => setEditModal(prev => ({ ...prev, open: o }))}>
                <DialogContent className="bg-white border-slate-200 max-w-lg">
                    <DialogHeader>
                        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 -mx-6 -mt-6 px-6 py-5 rounded-t-lg mb-4">
                            <DialogTitle className="text-white text-lg flex items-center gap-2">
                                <Edit3 className="w-5 h-5" /> Edit KYC Details
                            </DialogTitle>
                            <p className="text-teal-100 text-sm mt-1">
                                For <strong>{editModal.request?.memberName}</strong> ({editModal.request?.memberRelation}) —{' '}
                                {editModal.request?.customerName}
                            </p>
                        </div>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                            <strong>Customer's reason:</strong> {editModal.request?.reason}
                        </div>

                        <p className="text-xs text-slate-400">
                            Only fill in the fields that need to change. Leave blank to keep existing values.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <Label>Full Name (leave blank to keep)</Label>
                                <Input
                                    placeholder="Updated full name..."
                                    value={editForm.holderFullName}
                                    onChange={e => setEditForm(f => ({ ...f, holderFullName: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Relation</Label>
                                <Select value={editForm.relation} onValueChange={v => setEditForm(f => ({ ...f, relation: v }))}>
                                    <SelectTrigger className="bg-white border-slate-200">
                                        <SelectValue placeholder="Keep existing..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RELATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Aadhaar Number</Label>
                                <Input
                                    placeholder="12-digit number..."
                                    value={editForm.aadhaarNumber}
                                    onChange={e => setEditForm(f => ({ ...f, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }))}
                                    className="font-mono"
                                    maxLength={12}
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label>PAN Number</Label>
                                <Input
                                    placeholder="10-char PAN..."
                                    value={editForm.panNumber}
                                    onChange={e => setEditForm(f => ({ ...f, panNumber: e.target.value.toUpperCase().slice(0, 10) }))}
                                    className="font-mono uppercase"
                                    maxLength={10}
                                />
                            </div>
                            <div className="col-span-2 space-y-1.5">
                                <Label>Admin Note (internal)</Label>
                                <Textarea
                                    placeholder="Internal note about this change..."
                                    value={editForm.adminNote}
                                    onChange={e => setEditForm(f => ({ ...f, adminNote: e.target.value }))}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="mt-2">
                        <Button variant="outline" onClick={() => setEditModal({ open: false, request: null })}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveKYCEdit}
                            disabled={saving}
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                            Save KYC Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
