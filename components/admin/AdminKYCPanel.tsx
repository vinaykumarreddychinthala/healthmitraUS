'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    ShieldCheck, ShieldAlert, User, FileText, Camera,
    Loader2, RefreshCw, Edit3, ExternalLink, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AdminKYCPanelProps {
    memberId: string;
    memberName: string;
}

export default function AdminKYCPanel({ memberId, memberName }: AdminKYCPanelProps) {
    const [kyc, setKyc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [resetOpen, setResetOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [resetNotes, setResetNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [editData, setEditData] = useState<any>({});

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/kyc/${memberId}`);
            const data = await res.json();
            setKyc(data.data || null);
            if (data.data) setEditData({
                holder_full_name: data.data.holder_full_name,
                relation: data.data.relation,
                aadhaar_number: data.data.aadhaar_number || '',
                pan_number: data.data.pan_number || '',
                admin_notes: data.data.admin_notes || '',
            });
        } finally { setLoading(false); }
    };

    useEffect(() => { if (memberId) load(); }, [memberId]);

    const handleReset = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/kyc/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset', notes: resetNotes }),
            });
            const data = await res.json();
            if (data.success) { toast.success('KYC reset. Customer can re-submit.'); setResetOpen(false); load(); }
            else toast.error(data.error || 'Reset failed');
        } finally { setSaving(false); }
    };

    const handleEdit = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/kyc/${memberId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', updates: editData }),
            });
            const data = await res.json();
            if (data.success) { toast.success('KYC updated successfully.'); setEditOpen(false); load(); }
            else toast.error(data.error || 'Update failed');
        } finally { setSaving(false); }
    };

    if (loading) return (
        <div className="flex items-center gap-2 text-slate-500 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading KYC details...
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-teal-600" /> Policy Holder KYC
                </h3>
                {kyc?.kyc_submitted && !kyc?.admin_reset && (
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="gap-1.5 text-xs">
                            <Edit3 className="h-3 w-3" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setResetOpen(true)} className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50">
                            <RefreshCw className="h-3 w-3" /> Reset KYC
                        </Button>
                    </div>
                )}
            </div>

            {!kyc || !kyc.kyc_submitted || kyc.admin_reset ? (
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
                    <div>
                        <p className="font-medium text-amber-900">KYC Not Submitted</p>
                        <p className="text-sm text-amber-700 mt-0.5">
                            {kyc?.admin_reset
                                ? `KYC was reset by admin on ${format(new Date(kyc.admin_reset_at), 'MMM d, yyyy')}. Customer must re-submit.`
                                : 'This member has not yet submitted their policy holder details.'}
                        </p>
                        {kyc?.admin_notes && <p className="text-xs text-amber-600 mt-1">Note: {kyc.admin_notes}</p>}
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
                            <ShieldCheck className="h-3 w-3" /> KYC Verified
                        </Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(kyc.kyc_submitted_at), 'MMM d, yyyy — h:mm a')}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
                        {[
                            { label: 'Full Name', value: kyc.holder_full_name, icon: User },
                            { label: 'Relation', value: kyc.relation, icon: User },
                            {
                                label: 'Aadhaar',
                                value: kyc.aadhaar_declaration ? '✓ Self-declaration' : kyc.aadhaar_number || '—',
                                icon: FileText
                            },
                            {
                                label: 'PAN',
                                value: kyc.pan_declaration ? '✓ Self-declaration' : kyc.pan_number || '—',
                                icon: FileText
                            },
                        ].map(field => (
                            <div key={field.label}>
                                <p className="text-xs text-slate-500 mb-0.5">{field.label}</p>
                                <p className="font-medium text-slate-800">{field.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Photo */}
                    {kyc.photo_url && (
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                            <Camera className="h-4 w-4 text-slate-400 shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs text-slate-500">Photo</p>
                                <a href={kyc.photo_url} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-teal-600 hover:underline flex items-center gap-1">
                                    View Uploaded Photo <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            {kyc.photo_url.match(/\.(jpg|jpeg|png)$/i) && (
                                <img src={kyc.photo_url} alt="Member photo"
                                    className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                            )}
                        </div>
                    )}

                    {kyc.admin_notes && (
                        <p className="text-xs text-slate-500 italic border-l-2 border-slate-300 pl-3">{kyc.admin_notes}</p>
                    )}
                </div>
            )}

            {/* Reset Dialog */}
            <Dialog open={resetOpen} onOpenChange={setResetOpen}>
                <DialogContent className="bg-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">Reset KYC for {memberName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-slate-600">This will force the customer to re-submit their Policy Holder Details. Their current data will be kept until they resubmit.</p>
                        <div className="space-y-1.5">
                            <Label>Reason / Notes (optional)</Label>
                            <Textarea
                                value={resetNotes}
                                onChange={e => setResetNotes(e.target.value)}
                                placeholder="e.g. Incorrect Aadhaar number submitted..."
                                className="resize-none"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
                        <Button onClick={handleReset} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                            Reset KYC
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="bg-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">Edit KYC — {memberName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        {[
                            { key: 'holder_full_name', label: 'Full Name' },
                            { key: 'relation', label: 'Relation' },
                            { key: 'aadhaar_number', label: 'Aadhaar Number' },
                            { key: 'pan_number', label: 'PAN Number' },
                            { key: 'admin_notes', label: 'Admin Notes' },
                        ].map(field => (
                            <div key={field.key} className="space-y-1">
                                <Label>{field.label}</Label>
                                <Input
                                    value={editData[field.key] || ''}
                                    onChange={e => setEditData((prev: any) => ({ ...prev, [field.key]: e.target.value }))}
                                />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleEdit} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Edit3 className="h-4 w-4 mr-1" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
