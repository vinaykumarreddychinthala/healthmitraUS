'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    ShieldCheck, Lock, User, FileText, Camera,
    ExternalLink, Edit3, X, Fingerprint, CreditCard
} from 'lucide-react';

interface KYCDetailsReadOnlyProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    kycData: any;
    onRequestEdit: () => void;
}

function maskAadhaar(num: string | null): string {
    if (!num) return '—';
    const clean = num.replace(/\s/g, '');
    return `XXXX XXXX ${clean.slice(-4)}`;
}

function maskPAN(pan: string | null): string {
    if (!pan) return '—';
    return `${pan.slice(0, 2)}XXXXXXX${pan.slice(-1)}`;
}

export default function KYCDetailsReadOnly({
    isOpen, onClose, memberName, kycData, onRequestEdit
}: KYCDetailsReadOnlyProps) {
    if (!kycData) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white max-w-lg w-full p-0 overflow-hidden gap-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-5 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold text-white">Policy Holder Details</DialogTitle>
                            <p className="text-teal-100 text-sm mt-1">KYC information for <strong>{memberName}</strong></p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified
                        </div>
                    </div>
                </div>

                {/* Lock notice */}
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2.5 text-sm text-amber-800">
                    <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                        These details are <strong>locked</strong>. To make changes, raise an edit request — admin will update on your behalf.
                    </span>
                </div>

                {/* KYC Details */}
                <div className="px-6 py-5 space-y-5">
                    {/* Photo */}
                    <div className="flex items-center gap-4">
                        {kycData.photo_url ? (
                            <img
                                src={kycData.photo_url}
                                alt="Member photo"
                                className="w-20 h-20 rounded-xl object-cover border-2 border-teal-100 shadow-sm"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center border-2 border-slate-200">
                                <Camera className="w-8 h-8 text-slate-400" />
                            </div>
                        )}
                        <div>
                            <p className="font-bold text-slate-800 text-lg">{kycData.holder_full_name}</p>
                            <Badge variant="outline" className="mt-1 text-xs text-teal-700 border-teal-200 bg-teal-50">
                                {kycData.relation}
                            </Badge>
                            <p className="text-xs text-slate-400 mt-1">
                                Submitted {new Date(kycData.kyc_submitted_at).toLocaleDateString('en-IN', {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Identity Docs */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identity Documents</p>

                        {/* Aadhaar */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <Fingerprint className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">Aadhaar</p>
                                    <p className="text-sm font-mono font-semibold text-slate-800">
                                        {kycData.aadhaar_declaration
                                            ? 'Self-declared (no Aadhaar)'
                                            : maskAadhaar(kycData.aadhaar_number)}
                                    </p>
                                </div>
                            </div>
                            {kycData.aadhaar_file_url && !kycData.aadhaar_declaration && (
                                <a
                                    href={kycData.aadhaar_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
                                >
                                    View Doc <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {kycData.aadhaar_signature_url && kycData.aadhaar_declaration && (
                                <a
                                    href={kycData.aadhaar_signature_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-teal-600 hover:underline flex-col"
                                >
                                    <img src={kycData.aadhaar_signature_url} alt="Signature" className="h-6 w-auto mix-blend-multiply bg-transparent" />
                                    <span>View <ExternalLink className="w-3 h-3 inline" /></span>
                                </a>
                            )}
                        </div>

                        {/* PAN */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-medium">PAN</p>
                                    <p className="text-sm font-mono font-semibold text-slate-800">
                                        {kycData.pan_declaration
                                            ? 'Self-declared (no PAN)'
                                            : maskPAN(kycData.pan_number)}
                                    </p>
                                </div>
                            </div>
                            {kycData.pan_file_url && !kycData.pan_declaration && (
                                <a
                                    href={kycData.pan_file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-teal-600 hover:underline"
                                >
                                    View Doc <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                            {kycData.pan_signature_url && kycData.pan_declaration && (
                                <a
                                    href={kycData.pan_signature_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-teal-600 hover:underline flex-col"
                                >
                                    <img src={kycData.pan_signature_url} alt="Signature" className="h-6 w-auto mix-blend-multiply bg-transparent" />
                                    <span>View <ExternalLink className="w-3 h-3 inline" /></span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <Button variant="outline" onClick={onClose} className="gap-2">
                        <X className="w-4 h-4" /> Close
                    </Button>
                    <Button
                        onClick={onRequestEdit}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                        <Edit3 className="w-4 h-4" /> Request Edit
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
