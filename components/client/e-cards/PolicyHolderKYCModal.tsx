'use client';

import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Loader2, Upload, CheckCircle, User, FileText,
    ShieldCheck, ChevronRight, ChevronLeft, AlertCircle, Camera
} from 'lucide-react';
import { toast } from 'sonner';

interface PolicyHolderKYCModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId: string;
    memberName: string;
    onSuccess: () => void;
}

const STEPS = [
    { id: 1, label: 'Personal Details', icon: User },
    { id: 2, label: 'Identity Proof', icon: FileText },
    { id: 3, label: 'Photo Upload', icon: Camera },
    { id: 4, label: 'Review & Submit', icon: ShieldCheck },
];

const RELATIONS = ['Self', 'Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Other'];

export default function PolicyHolderKYCModal({
    isOpen, onClose, memberId, memberName, onSuccess
}: PolicyHolderKYCModalProps) {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Form state
    const [holderFullName, setHolderFullName] = useState('');
    const [relation, setRelation] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [aadhaarDeclaration, setAadhaarDeclaration] = useState(false);
    const [panNumber, setPanNumber] = useState('');
    const [panDeclaration, setPanDeclaration] = useState(false);
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error('Photo must be less than 2MB'); return; }
        const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowed.includes(file.type)) { toast.error('Only JPEG, PNG, or PDF allowed'); return; }
        setPhoto(file);
        if (file.type !== 'application/pdf') {
            const url = URL.createObjectURL(file);
            setPhotoPreview(url);
        } else {
            setPhotoPreview(null);
        }
    };

    const canProceedStep1 = holderFullName.trim().length >= 2 && relation !== '';
    const canProceedStep2 = (aadhaarDeclaration || aadhaarNumber.replace(/\D/g, '').length === 12)
        && (panDeclaration || panNumber.length === 10);
    const canProceedStep3 = photo !== null;

    const handleNext = () => {
        if (step === 1 && !canProceedStep1) { toast.error('Please fill in your full name and relation'); return; }
        if (step === 2 && !canProceedStep2) {
            if (!aadhaarDeclaration && aadhaarNumber.replace(/\D/g, '').length !== 12) {
                toast.error('Enter a valid 12-digit Aadhaar number or check the declaration box');
            } else {
                toast.error('Enter a valid 10-character PAN number or check the declaration box');
            }
            return;
        }
        if (step === 3 && !canProceedStep3) { toast.error('Please upload your current photo'); return; }
        setStep(s => s + 1);
    };

    const handleSubmit = async () => {
        if (!photo) return;
        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('memberId', memberId);
            formData.append('holderFullName', holderFullName.trim());
            formData.append('relation', relation);
            formData.append('aadhaarNumber', aadhaarNumber.replace(/\D/g, ''));
            formData.append('aadhaarDeclaration', String(aadhaarDeclaration));
            formData.append('panNumber', panNumber.toUpperCase());
            formData.append('panDeclaration', String(panDeclaration));
            formData.append('photo', photo);

            const res = await fetch('/api/kyc', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                toast.success('KYC submitted successfully!');
                onSuccess();
                onClose();
            } else {
                toast.error(data.error || 'Submission failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const formatAadhaar = (v: string) => {
        const digits = v.replace(/\D/g, '').slice(0, 12);
        return digits.replace(/(\d{4})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
            [a, b, c].filter(Boolean).join(' ')
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white max-w-lg w-full p-0 overflow-hidden gap-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-5 text-white">
                    <DialogTitle className="text-xl font-bold text-white">Policy Holder Details</DialogTitle>
                    <p className="text-teal-100 text-sm mt-1">
                        Complete KYC for <strong>{memberName}</strong> to download your E-Card
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
                    {STEPS.map((s, idx) => (
                        <div key={s.id} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                    ${step > s.id ? 'bg-emerald-500 text-white' :
                                    step === s.id ? 'bg-teal-600 text-white ring-4 ring-teal-100' :
                                    'bg-slate-200 text-slate-400'}`}>
                                    {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                                </div>
                                <span className={`text-[10px] mt-1 font-medium hidden sm:block
                                    ${step === s.id ? 'text-teal-700' : step > s.id ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {s.label}
                                </span>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 transition-all ${step > s.id ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="px-6 py-5 space-y-5 min-h-[280px]">
                    {/* Step 1: Personal Details */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="holderFullName" className="text-slate-700 font-medium">
                                    Full Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="holderFullName"
                                    placeholder="As per government ID"
                                    value={holderFullName}
                                    onChange={e => setHolderFullName(e.target.value)}
                                    className="h-11"
                                />
                                <p className="text-xs text-slate-400">Enter your legal name exactly as it appears on your ID documents</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-700 font-medium">
                                    Relation with Profile Holder <span className="text-red-500">*</span>
                                </Label>
                                <Select value={relation} onValueChange={setRelation}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder="Select relation..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RELATIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Identity Proof */}
                    {step === 2 && (
                        <div className="space-y-5">
                            {/* Aadhaar */}
                            <div className="space-y-3 p-4 border border-slate-200 rounded-xl">
                                <p className="font-semibold text-slate-800 text-sm">Aadhaar Card</p>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-xs">Aadhaar Number <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="XXXX XXXX XXXX"
                                        value={aadhaarNumber}
                                        onChange={e => setAadhaarNumber(formatAadhaar(e.target.value))}
                                        disabled={aadhaarDeclaration}
                                        className="h-10 font-mono tracking-widest"
                                        maxLength={14}
                                    />
                                </div>
                                <div className="flex items-start gap-2.5 pt-1">
                                    <Checkbox
                                        id="aadhaarDecl"
                                        checked={aadhaarDeclaration}
                                        onCheckedChange={(v) => { setAadhaarDeclaration(!!v); setAadhaarNumber(''); }}
                                    />
                                    <label htmlFor="aadhaarDecl" className="text-xs text-slate-600 leading-snug cursor-pointer">
                                        <strong>I hereby declare</strong> that I do not possess an Aadhaar card and take full responsibility for this declaration.
                                    </label>
                                </div>
                            </div>

                            {/* PAN */}
                            <div className="space-y-3 p-4 border border-slate-200 rounded-xl">
                                <p className="font-semibold text-slate-800 text-sm">PAN Card</p>
                                <div className="space-y-2">
                                    <Label className="text-slate-600 text-xs">PAN Number <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="ABCDE1234F"
                                        value={panNumber}
                                        onChange={e => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                                        disabled={panDeclaration}
                                        className="h-10 font-mono tracking-widest uppercase"
                                        maxLength={10}
                                    />
                                </div>
                                <div className="flex items-start gap-2.5 pt-1">
                                    <Checkbox
                                        id="panDecl"
                                        checked={panDeclaration}
                                        onCheckedChange={(v) => { setPanDeclaration(!!v); setPanNumber(''); }}
                                    />
                                    <label htmlFor="panDecl" className="text-xs text-slate-600 leading-snug cursor-pointer">
                                        <strong>I hereby declare</strong> that I do not possess a PAN card and take full responsibility for this declaration.
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Photo Upload */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all group"
                            >
                                {photoPreview ? (
                                    <div className="space-y-3">
                                        <img src={photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto border-4 border-teal-200 shadow-lg" />
                                        <p className="text-sm text-teal-600 font-medium">{photo?.name}</p>
                                        <p className="text-xs text-slate-400">Click to change photo</p>
                                    </div>
                                ) : photo ? (
                                    <div className="space-y-2">
                                        <div className="w-20 h-20 bg-teal-100 rounded-xl flex items-center justify-center mx-auto">
                                            <FileText className="w-10 h-10 text-teal-600" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">{photo.name}</p>
                                        <p className="text-xs text-emerald-500">PDF uploaded ✓</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-16 h-16 bg-slate-100 group-hover:bg-teal-100 rounded-2xl flex items-center justify-center mx-auto transition-colors">
                                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-500 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Upload Current Photo</p>
                                            <p className="text-sm text-slate-400 mt-1">Click to browse or drag & drop</p>
                                        </div>
                                    </div>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </div>
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Upload a recent passport-size photo (JPEG/PNG) or a scanned document (PDF). Max size 2MB. This photo will appear on your E-Card.</span>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {step === 4 && (
                        <div className="space-y-3">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-sm">
                                {[
                                    { label: 'Full Name', value: holderFullName },
                                    { label: 'Relation', value: relation },
                                    { label: 'Aadhaar', value: aadhaarDeclaration ? '✓ Self-declaration submitted' : aadhaarNumber },
                                    { label: 'PAN', value: panDeclaration ? '✓ Self-declaration submitted' : panNumber },
                                    { label: 'Photo', value: photo?.name || '-' },
                                ].map(field => (
                                    <div key={field.label} className="flex justify-between items-start gap-4">
                                        <span className="text-slate-500 shrink-0 w-24">{field.label}</span>
                                        <span className="font-medium text-slate-800 text-right break-all">{field.value}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-bold">Important Notice</p>
                                    <p className="mt-1">Once submitted, <strong>these details cannot be edited or deleted by you</strong>. Only a HealthMitra Admin can make changes. Please verify everything is correct before submitting.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <Button
                        variant="outline"
                        onClick={() => step === 1 ? onClose() : setStep(s => s - 1)}
                        className="gap-2"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {step === 1 ? 'Cancel' : 'Back'}
                    </Button>

                    {step < 4 ? (
                        <Button onClick={handleNext} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                            Next <ChevronRight className="w-4 h-4" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                        >
                            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><ShieldCheck className="w-4 h-4" /> Submit KYC</>}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
