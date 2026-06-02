'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    ArrowLeft, Save, Building2, Shield, Upload, X, FileText, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Franchise, DEFAULT_MODULES, FranchiseModule } from '@/types/franchise';
import { createFranchise } from '@/app/actions/franchise';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function DocumentUpload({
    label,
    value,
    onChange,
    bucket = 'documents',
    folder = 'kyc'
}: {
    label: string;
    value?: string;
    onChange: (url: string) => void;
    bucket?: string;
    folder?: string;
}) {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', bucket);
        formData.append('folder', folder);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success && data.data?.url) {
                onChange(data.data.url);
                toast.success(`${label} uploaded successfully`);
            } else {
                toast.error(data.error || 'Failed to upload document');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to upload document');
        } finally {
            setUploading(false);
        }
    };

    const getFileName = (url: string) => {
        try {
            const decoded = decodeURIComponent(url);
            const parts = decoded.split('/');
            const name = parts[parts.length - 1];
            return name.replace(/^\d+-([a-z0-9]+-)?/, '');
        } catch {
            return 'Document';
        }
    };

    const isImage = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
    };

    return (
        <div className="space-y-2">
            <Label className="text-slate-600 font-medium">{label}</Label>
            {value ? (
                <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50/50 rounded-lg text-emerald-800 text-sm">
                    <div className="flex items-center gap-3 truncate">
                        {isImage(value) ? (
                            <img src={value} alt="Preview" className="h-8 w-8 rounded object-cover border border-emerald-200 shrink-0" />
                        ) : (
                            <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                        <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium truncate hover:underline hover:text-emerald-950 flex items-center gap-1.5"
                            title="Click to view document"
                        >
                            {getFileName(value)}
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">View</span>
                        </a>
                    </div>
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="p-1 rounded-full hover:bg-emerald-100 text-emerald-600 transition-colors shrink-0 ml-2"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="file"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                        id={`upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
                        accept=".jpg,.jpeg,.png,.pdf"
                    />
                    <label
                        htmlFor={`upload-${label.replace(/\s+/g, '-').toLowerCase()}`}
                        className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-teal-500 hover:bg-slate-50 transition-all text-sm font-medium text-slate-600
                            ${uploading ? 'pointer-events-none opacity-50 bg-slate-50' : ''}`}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 text-slate-400" />
                                <span>Upload Document (PDF or Image)</span>
                            </>
                        )}
                    </label>
                </div>
            )}
        </div>
    );
}

export default function AddFranchisePage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [franchise, setFranchise] = useState<Partial<Franchise>>({
        name: '', startDate: '', endDate: '', contact: '', altContact: '',
        email: '', password: '', referralCode: '', website: '', gst: '',
        commissionPercent: 10, kycStatus: 'pending', verificationStatus: 'unverified',
        address: '', city: '', state: '', payoutDelay: 7, status: 'active',
        aadhaarNumber: '', panNumber: '',
        aadhaarFront: '', aadhaarBack: '', panCard: '', photo: '',
    });

    const [modules, setModules] = useState<FranchiseModule[]>(
        DEFAULT_MODULES.map(m => ({ ...m }))
    );

    const update = (updates: Partial<Franchise>) => setFranchise(prev => ({ ...prev, ...updates }));

    const toggleModuleAccess = (moduleId: string, field: keyof FranchiseModule) => {
        setModules(prev => prev.map(m =>
            m.id === moduleId ? { ...m, [field]: !m[field] } : m
        ));
    };

    const handleSave = async () => {
        if (!franchise.name || !franchise.email || !franchise.referralCode || !franchise.contact) {
            toast.error('Please fill in required fields'); return;
        }
        setSaving(true);
        const hasDocs = franchise.aadhaarFront || franchise.aadhaarBack || franchise.panCard || franchise.photo;
        const res = await createFranchise({
            ...franchise,
            kycStatus: hasDocs ? 'submitted' : 'pending'
        });
        if (res.success) {
            toast.success('Franchise created successfully');
            router.push('/admin/franchises');
        } else {
            toast.error(res.error || 'Failed to create franchise');
        }
        setSaving(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in py-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/admin/franchises">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900"><ArrowLeft className="h-5 w-5" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Add New Franchise</h1>
                        <p className="text-sm text-slate-500">Fill in all details to register a new franchise partner.</p>
                    </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Franchise
                </Button>
            </div>

            {/* Basic Details */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-700 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-teal-500" /> Franchise Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Franchise Name *" value={franchise.name} onChange={v => update({ name: v })} placeholder="e.g. HealthMitra Delhi NCR" />
                        <Field label="Email *" value={franchise.email} onChange={v => update({ email: v })} placeholder="email@domain.com" type="email" />
                        <Field label="Password *" value={franchise.password} onChange={v => update({ password: v })} placeholder="Login password" type="password" />
                        <Field label="Referral Code *" value={franchise.referralCode} onChange={v => update({ referralCode: v })} placeholder="e.g. HMDEL2024" />
                        <Field label="Contact Number *" value={franchise.contact} onChange={v => update({ contact: v })} placeholder="+91 98765 00001" />
                        <Field label="Alternate Contact" value={franchise.altContact} onChange={v => update({ altContact: v })} placeholder="+91 98765 00002" />
                        <Field label="Start Date *" value={franchise.startDate} onChange={v => update({ startDate: v })} type="date" />
                        <Field label="End Date *" value={franchise.endDate} onChange={v => update({ endDate: v })} type="date" />
                        <Field label="Website" value={franchise.website} onChange={v => update({ website: v })} placeholder="https://..." />
                        {/* <Field label="GST Number" value={franchise.gst} onChange={v => update({ gst: v })} placeholder="GST registration number" /> */}
                    </div>
                </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-700">Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-600">Full Address</Label>
                        <Textarea value={franchise.address} onChange={e => update({ address: e.target.value })} placeholder="Street address..." className="bg-white border-slate-200 text-slate-900" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="City *" value={franchise.city} onChange={v => update({ city: v })} placeholder="e.g. New Delhi" />
                        <Field label="State *" value={franchise.state} onChange={v => update({ state: v })} placeholder="e.g. Delhi" />
                    </div>
                </CardContent>
            </Card>

            {/* Commission & Payout */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-700">Financial Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Commission (%)</Label>
                            <Input type="number" value={franchise.commissionPercent} onChange={e => update({ commissionPercent: parseFloat(e.target.value) })} className="bg-white border-slate-200 text-slate-900" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Payout Delay (days)</Label>
                            <Input type="number" value={franchise.payoutDelay} onChange={e => update({ payoutDelay: parseInt(e.target.value) })} className="bg-white border-slate-200 text-slate-900" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">KYC Status</Label>
                            <Select value={franchise.kycStatus} onValueChange={v => update({ kycStatus: v as any })}>
                                <SelectTrigger className="bg-white border-slate-200 text-slate-900"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 text-slate-900">
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="submitted">Submitted</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KYC Details */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-700">KYC Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Aadhaar Number" value={franchise.aadhaarNumber} onChange={v => update({ aadhaarNumber: v })} placeholder="XXXX XXXX XXXX" />
                        <Field label="PAN Number" value={franchise.panNumber} onChange={v => update({ panNumber: v })} placeholder="ABCDE1234F" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-4">
                        <DocumentUpload label="Aadhaar Front Document" value={franchise.aadhaarFront} onChange={url => update({ aadhaarFront: url })} />
                        <DocumentUpload label="Aadhaar Back Document" value={franchise.aadhaarBack} onChange={url => update({ aadhaarBack: url })} />
                        <DocumentUpload label="PAN Card Document" value={franchise.panCard} onChange={url => update({ panCard: url })} />
                        <DocumentUpload label="Franchise Photo" value={franchise.photo} onChange={url => update({ photo: url })} />
                    </div>
                </CardContent>
            </Card>

            {/* Module Assignment */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base text-slate-700 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-teal-500" /> Module Assignment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 border-slate-200">
                                <TableHead className="text-slate-600 font-semibold">S.No.</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Module Name</TableHead>
                                <TableHead className="text-slate-600 font-semibold text-center">Add</TableHead>
                                <TableHead className="text-slate-600 font-semibold text-center">Edit</TableHead>
                                <TableHead className="text-slate-600 font-semibold text-center">Delete</TableHead>
                                <TableHead className="text-slate-600 font-semibold text-center">Upload</TableHead>
                                <TableHead className="text-slate-600 font-semibold text-center">Download</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modules.map(m => (
                                <TableRow key={m.id} className="border-slate-100">
                                    <TableCell className="text-slate-500 font-mono text-sm">{m.sno}</TableCell>
                                    <TableCell className="font-medium text-slate-800">{m.moduleName}</TableCell>
                                    {(['addAccess', 'editAccess', 'deleteAccess', 'uploadAccess', 'downloadAccess'] as const).map(field => (
                                        <TableCell key={field} className="text-center">
                                            <Checkbox checked={m[field]} onCheckedChange={() => toggleModuleAccess(m.id, field)} />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
    label: string; value?: string | number; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-slate-600">{label}</Label>
            <Input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-white border-slate-200 text-slate-900" />
        </div>
    );
}
