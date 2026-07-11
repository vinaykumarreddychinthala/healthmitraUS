'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Loader2, Upload, CheckCircle, User, FileText,
    ShieldCheck, ChevronRight, ChevronLeft, AlertCircle, Camera, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from '@/components/client/e-cards/SignaturePad';

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

    // Form state
    const [holderFullName, setHolderFullName] = useState('');
    const [relation, setRelation] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState('');
    const [bloodGroup, setBloodGroup] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [aadhaarDeclaration, setAadhaarDeclaration] = useState(false);
    const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
    const [aadhaarSignature, setAadhaarSignature] = useState<string | null>(null);

    const [panNumber, setPanNumber] = useState('');
    const [panDeclaration, setPanDeclaration] = useState(false);
    const [panFile, setPanFile] = useState<File | null>(null);
    const [panSignature, setPanSignature] = useState<string | null>(null);
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

    const handlePreview = (e: React.MouseEvent, file: File | null) => {
        e.preventDefault();
        e.stopPropagation();
        if (!file) return;
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
    };

    // Blood group is optional; all other personal fields are required
    const canProceedStep1 = holderFullName.trim().length >= 2 && relation !== '' && dob !== '' && gender !== '';
    // Step 2: Aadhaar must be (12-digit number + file) OR (declaration checked + signature). PAN same rule.
    const aadhaarValid = (aadhaarDeclaration && aadhaarSignature) || (!aadhaarDeclaration && aadhaarNumber.replace(/\D/g, '').length === 12 && aadhaarFile !== null);
    const panValid = (panDeclaration && panSignature) || (!panDeclaration && panNumber.length === 10 && panFile !== null);
    const canProceedStep2 = aadhaarValid && panValid;
    const canProceedStep3 = photo !== null;

    const handleNext = () => {
        if (step === 1 && !canProceedStep1) { toast.error('Please fill in Name, Relation, Date of Birth and Gender to continue'); return; }
        if (step === 2) {
            if (!aadhaarValid) {
                if (aadhaarDeclaration && !aadhaarSignature) {
                    toast.error('Please provide your digital signature for the Aadhaar declaration');
                    return;
                }
                if (!aadhaarDeclaration && aadhaarNumber.replace(/\D/g, '').length !== 12) {
                    toast.error('Please enter a valid 12-digit Aadhaar number or check the declaration');
                    return;
                }
                if (!aadhaarDeclaration && !aadhaarFile) {
                    toast.error('Please upload your Aadhaar document or check the declaration');
                    return;
                }
            }
            if (!panValid) {
                if (panDeclaration && !panSignature) {
                    toast.error('Please provide your digital signature for the PAN declaration');
                    return;
                }
                if (!panDeclaration && panNumber.length !== 10) {
                    toast.error('Please enter a valid 10-character PAN number or check the declaration');
                    return;
                }
                if (!panDeclaration && !panFile) {
                    toast.error('Please upload your PAN document or check the declaration');
                    return;
                }
            }
            if (!canProceedStep2) return;
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
            formData.append('dob', dob);
            formData.append('gender', gender);
            formData.append('bloodGroup', bloodGroup);
            formData.append('aadhaarNumber', aadhaarNumber.replace(/\D/g, ''));
            formData.append('aadhaarDeclaration', aadhaarDeclaration.toString());
            if (aadhaarFile) formData.append('aadhaarFile', aadhaarFile);
            if (aadhaarDeclaration && aadhaarSignature) {
                formData.append('aadhaarSignatureBase64', aadhaarSignature);
            }
            
            formData.append('panNumber', panNumber);
            formData.append('panDeclaration', panDeclaration.toString());
            if (panFile) formData.append('panFile', panFile);
            if (panDeclaration && panSignature) {
                formData.append('panSignatureBase64', panSignature);
            }
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
            <DialogContent className="bg-white max-w-lg w-full p-0 overflow-hidden gap-0 max-h-[90vh] flex flex-col">
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

                {/* Step Content — scrollable */}
                <div className="px-6 py-5 space-y-5 min-h-[280px] overflow-y-auto flex-1">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">
                                        Date of Birth <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        value={dob}
                                        onChange={e => setDob(e.target.value)}
                                        className="h-11"
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">
                                        Gender <span className="text-red-500">*</span>
                                    </Label>
                                    <Select value={gender} onValueChange={setGender}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select gender..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="M">Male</SelectItem>
                                            <SelectItem value="F">Female</SelectItem>
                                            <SelectItem value="O">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">
                                        Blood Group <span className="text-slate-400 font-normal text-xs">(optional)</span>
                                    </Label>
                                    <Select value={bloodGroup} onValueChange={setBloodGroup}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Select blood group..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                <div className="space-y-2 pt-2">
                                    <Label className="text-slate-600 text-xs">Aadhaar Document Upload <span className="text-red-500">*</span></Label>
                                    <div className={`flex items-center justify-between border rounded-lg p-2 ${aadhaarDeclaration ? 'bg-slate-50 opacity-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs text-slate-500 truncate max-w-[150px]">{aadhaarFile ? aadhaarFile.name : 'No file selected'}</span>
                                            {aadhaarFile && (
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => handlePreview(e, aadhaarFile)} 
                                                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-1 rounded transition-colors"
                                                    title="Preview document"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            disabled={aadhaarDeclaration} 
                                            className="h-7 text-xs cursor-pointer shrink-0"
                                            asChild
                                        >
                                            <label>
                                                Choose File
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/jpeg,image/png,application/pdf" 
                                                    onChange={e => e.target.files && setAadhaarFile(e.target.files[0])} 
                                                    disabled={aadhaarDeclaration} 
                                                />
                                            </label>
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 pt-1">
                                    <Checkbox
                                        id="aadhaarDecl"
                                        checked={aadhaarDeclaration}
                                        onCheckedChange={(v) => { 
                                            setAadhaarDeclaration(!!v); 
                                            setAadhaarNumber(''); 
                                            setAadhaarFile(null);
                                            if (!v) setAadhaarSignature(null);
                                        }}
                                    />
                                    <label htmlFor="aadhaarDecl" className="text-xs text-slate-600 leading-snug cursor-pointer">
                                        <strong>I hereby declare</strong> that I do not possess an Aadhaar card and take full responsibility for this declaration.
                                    </label>
                                </div>
                                {aadhaarDeclaration && (
                                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label className="text-slate-600 text-xs mb-1 block">Digital Signature <span className="text-red-500">*</span></Label>
                                        <SignaturePad onEnd={(b64) => setAadhaarSignature(b64)} />
                                        {!aadhaarSignature && <p className="text-[10px] text-red-500 mt-1">Signature is required to proceed</p>}
                                    </div>
                                )}
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
                                <div className="space-y-2 pt-2">
                                    <Label className="text-slate-600 text-xs">PAN Document Upload <span className="text-red-500">*</span></Label>
                                    <div className={`flex items-center justify-between border rounded-lg p-2 ${panDeclaration ? 'bg-slate-50 opacity-50' : 'bg-white'}`}>
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-xs text-slate-500 truncate max-w-[150px]">{panFile ? panFile.name : 'No file selected'}</span>
                                            {panFile && (
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => handlePreview(e, panFile)} 
                                                    className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-1 rounded transition-colors"
                                                    title="Preview document"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            disabled={panDeclaration} 
                                            className="h-7 text-xs cursor-pointer shrink-0"
                                            asChild
                                        >
                                            <label>
                                                Choose File
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/jpeg,image/png,application/pdf" 
                                                    onChange={e => e.target.files && setPanFile(e.target.files[0])} 
                                                    disabled={panDeclaration} 
                                                />
                                            </label>
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2.5 pt-1">
                                    <Checkbox
                                        id="panDecl"
                                        checked={panDeclaration}
                                        onCheckedChange={(v) => { 
                                            setPanDeclaration(!!v); 
                                            setPanNumber(''); 
                                            setPanFile(null);
                                            if (!v) setPanSignature(null);
                                        }}
                                    />
                                    <label htmlFor="panDecl" className="text-xs text-slate-600 leading-snug cursor-pointer">
                                        <strong>I hereby declare</strong> that I do not possess a PAN card and take full responsibility for this declaration.
                                    </label>
                                </div>
                                {panDeclaration && (
                                    <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Label className="text-slate-600 text-xs mb-1 block">Digital Signature <span className="text-red-500">*</span></Label>
                                        <SignaturePad onEnd={(b64) => setPanSignature(b64)} />
                                        {!panSignature && <p className="text-[10px] text-red-500 mt-1">Signature is required to proceed</p>}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Photo Upload */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <label
                                className="block border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-all group relative"
                            >
                                {photoPreview ? (
                                    <div className="space-y-3">
                                        <img src={photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-xl mx-auto border-4 border-teal-200 shadow-lg" />
                                        <div className="flex items-center justify-center gap-2">
                                            <p className="text-sm text-teal-600 font-medium">{photo?.name}</p>
                                            <button 
                                                type="button"
                                                onClick={(e) => handlePreview(e, photo)}
                                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-1 rounded transition-colors"
                                                title="View full image"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-400">Click anywhere to change photo</p>
                                    </div>
                                ) : photo ? (
                                    <div className="space-y-2">
                                        <div className="w-20 h-20 bg-teal-100 rounded-xl flex items-center justify-center mx-auto">
                                            <FileText className="w-10 h-10 text-teal-600" />
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            <p className="text-sm font-medium text-slate-700">{photo.name}</p>
                                            <button 
                                                type="button"
                                                onClick={(e) => handlePreview(e, photo)}
                                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-1 rounded transition-colors"
                                                title="View PDF"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-emerald-500">PDF uploaded ✓</p>
                                        <p className="text-xs text-slate-400">Click anywhere to change document</p>
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
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,application/pdf"
                                    className="hidden"
                                    onChange={handlePhotoChange}
                                />
                            </label>
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
                                    { label: 'DOB', value: dob },
                                    { label: 'Gender', value: gender === 'M' ? 'Male' : gender === 'F' ? 'Female' : gender === 'O' ? 'Other' : '' },
                                    { label: 'Blood Grp', value: bloodGroup },
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
