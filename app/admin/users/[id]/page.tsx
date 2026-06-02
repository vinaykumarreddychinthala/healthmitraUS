'use client';

import React, { useState, useEffect, use } from 'react';
import { User } from '@/types/user';
import { getUser, toggleUserStatus, changePlan, resendCredentials, activateNewPlan, getDepartments, updateUser, getUserPolicyMembers } from '@/app/actions/users';
import { getUserMembersWithKYC, adminUpdateKYCDetails } from '@/app/actions/kyc-admin';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
    ArrowLeft, Edit2, Mail, Phone, Clock, Shield, UserX, UserCheck,
    MapPin, Globe, CreditCard, FileText, Send, Loader2, RefreshCw,
    Calendar, User as UserIcon, Landmark, Upload, Eye, Save, X,
    ShieldCheck, ShieldAlert, Lock, ExternalLink, Edit3, Fingerprint
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const KYC_STYLES: Record<string, string> = {
    verified: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    rejected: 'bg-red-100 text-red-600 border-red-200',
};

const TYPE_STYLES: Record<string, string> = {
    Admin: 'bg-indigo-100 text-indigo-700', Employee: 'bg-blue-100 text-blue-700',
    Customer: 'bg-teal-100 text-teal-700', 'Referral Partner': 'bg-orange-100 text-orange-700',
    Doctor: 'bg-pink-100 text-pink-700'
};

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [departments, setDepartments] = useState<any[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<{
        name: string;
        email: string;
        phone: string;
        city: string;
        state: string;
        departmentId: string;
        designation: string;
    }>({
        name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        departmentId: '',
        designation: '',
    });
    const [saving, setSaving] = useState(false);

    const [policyMembers, setPolicyMembers] = useState<any[]>([]);
    const [loadingMembers, setLoadingMembers] = useState(false);

    // KYC members with full data (for the enhanced tab)
    const [kycMembers, setKycMembers] = useState<any[]>([]);
    const [loadingKyc, setLoadingKyc] = useState(false);

    // Admin direct KYC edit modal
    const [kycEditModal, setKycEditModal] = useState<{ open: boolean; member: any | null }>({ open: false, member: null });
    const [kycEditForm, setKycEditForm] = useState({ holderFullName: '', relation: '', aadhaarNumber: '', panNumber: '', adminNote: '' });
    const [savingKyc, setSavingKyc] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch Departments for mapping
                const depts = await getDepartments();
                if (depts.success && depts.data) setDepartments(depts.data);

                const res = await getUser(id);
                if (res.success && res.data) {
                    const u = res.data;
                    setUser(u);
                    setEditForm({
                        name: u.name || '',
                        email: u.email || '',
                        phone: u.phone || '',
                        city: (u as any).city || '',
                        state: (u as any).state || '',
                        departmentId: (u as any).departmentId || '',
                        designation: (u as any).designation || '',
                    });
                } else {
                    toast.error("User not found");
                }
            } catch (err) {
                toast.error("Failed to load user");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    useEffect(() => {
        const loadMembers = async () => {
            setLoadingMembers(true);
            const res = await getUserPolicyMembers(id);
            if (res.success && res.data) setPolicyMembers(res.data);
            setLoadingMembers(false);
        };
        loadMembers();
    }, [id]);

    useEffect(() => {
        const loadKyc = async () => {
            setLoadingKyc(true);
            const res = await getUserMembersWithKYC(id);
            if (res.success) setKycMembers(res.data);
            setLoadingKyc(false);
        };
        loadKyc();
    }, [id]);

    const handleAdminKycEdit = (member: any) => {
        setKycEditForm({
            holderFullName: member.kyc?.holderFullName || '',
            relation: member.kyc?.relation || member.relation || '',
            aadhaarNumber: member.kyc?.aadhaarNumber || '',
            panNumber: member.kyc?.panNumber || '',
            adminNote: '',
        });
        setKycEditModal({ open: true, member });
    };

    const handleSaveAdminKyc = async () => {
        if (!kycEditModal.member) return;
        setSavingKyc(true);
        try {
            const res = await adminUpdateKYCDetails(kycEditModal.member.id, {
                holderFullName: kycEditForm.holderFullName || undefined,
                relation: kycEditForm.relation || undefined,
                aadhaarNumber: kycEditForm.aadhaarNumber || undefined,
                panNumber: kycEditForm.panNumber || undefined,
                adminNote: kycEditForm.adminNote || undefined,
            });
            if (res.success) {
                toast.success('KYC updated successfully');
                setKycEditModal({ open: false, member: null });
                // Reload KYC data
                const refreshed = await getUserMembersWithKYC(id);
                if (refreshed.success) setKycMembers(refreshed.data);
            } else {
                toast.error(res.error || 'Failed to update KYC');
            }
        } finally {
            setSavingKyc(false);
        }
    };

    const handleEditToggle = () => {
        if (isEditing && user) {
            setEditForm({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                city: (user as any).city || '',
                state: (user as any).state || '',
                departmentId: (user as any).departmentId || '',
                designation: (user as any).designation || '',
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSaveEdit = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const res = await updateUser(user.id, {
                name: editForm.name,
                email: editForm.email,
                phone: editForm.phone,
                city: editForm.city,
                state: editForm.state,
                departmentId: editForm.departmentId || undefined,
                designation: editForm.designation || undefined,
            });
            if (res.success) {
                setUser({ ...user, name: editForm.name, email: editForm.email, phone: editForm.phone });
                setIsEditing(false);
                toast.success('User updated successfully');
            } else {
                toast.error(res.error || 'Failed to update user');
            }
        } catch (err) {
            toast.error('Failed to update user');
        } finally {
            setSaving(false);
        }
    };

    const supabase = createClient();
    const [plans, setPlans] = useState<{id: string, name: string}[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');

    useEffect(() => {
        const loadPlans = async () => {
            const { data } = await supabase.from('plans').select('id, name').eq('status', 'active');
            if (data) setPlans(data);
        };
        loadPlans();
    }, []);

    const handleToggleStatus = async () => {
        if (!user) return;
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        const res = await toggleUserStatus(user.id, newStatus);
        if (res.success) {
            setUser({ ...user, status: newStatus as any });
            toast.success(res.message);
        } else {
            toast.error(res.error);
        }
    };

    const handleChangePlan = async (planId: string) => {
        if (!user) return;
        const selectedPlan = plans.find(p => p.id === planId);
        const res = await changePlan(user.id, planId, selectedPlan?.name || planId);
        if (res.success) {
            setUser({ ...user, planId, planName: selectedPlan?.name || planId });
            toast.success(res.message);
        }
    };

    const handleResend = async (method: 'whatsapp' | 'email') => {
        if (!user) return;
        const res = await resendCredentials(user.id, method);
        if (res.success) toast.success(res.message);
    };

    const handleActivatePlan = async () => {
        if (!user) return;
        if (!selectedPlanId) {
            toast.error('Please select a plan first');
            return;
        }
        const res = await activateNewPlan(user.id, selectedPlanId);
        if (res.success) {
            toast.success(res.message);
        } else {
            toast.error(res.error || 'Failed to activate plan');
        }
    };

    const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    // Helper to get dep name
    // @ts-ignore
    const getDeptName = (id: string) => departments.find(d => d.id === id)?.name;

    if (loading) return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>;
    if (!user) return <div className="text-center py-20 text-slate-400">User not found.</div>;

    return (
        <div className="space-y-6 animate-in fade-in py-6 max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <Button variant="ghost" className="mb-4 pl-0 text-slate-500 hover:text-teal-600" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
                </Button>

                <div className="flex flex-col md:flex-row gap-6">
                    <Avatar className="h-20 w-20 border-2 border-slate-200">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                        <AvatarFallback className="text-xl bg-slate-100 text-slate-600">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500 border-slate-200">{user.id}</Badge>
                                    <Badge className={`text-xs ${TYPE_STYLES[user.type]}`}>{user.type}</Badge>
                                    <Badge className={`text-xs border ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                                        {user.status}
                                    </Badge>
                                    {/* @ts-ignore */}
                                    {user.planName && <Badge className="text-xs bg-cyan-100 text-cyan-700">{user.planName}</Badge>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <Button variant="outline" size="sm" className="border-slate-200 text-slate-600" onClick={handleEditToggle}><X className="mr-1.5 h-3.5 w-3.5" /> Cancel</Button>
                                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSaveEdit} disabled={saving}>
                                            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />} Save
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="outline" size="sm" className="border-slate-200 text-slate-600" onClick={handleEditToggle}><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                                )}
                                <Button variant="outline" size="sm" onClick={handleToggleStatus} className={user.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}>
                                    {user.status === 'active' ? <><UserX className="mr-1.5 h-3.5 w-3.5" /> Disable</> : <><UserCheck className="mr-1.5 h-3.5 w-3.5" /> Enable</>}
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-6 mt-3 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {user.email}</span>
                            <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {user.phone}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Joined {fmt(user.joinedDate)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="profile">
                <TabsList className="bg-slate-100 border border-slate-200">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-white data-[state=active]:text-teal-700">Profile</TabsTrigger>
                    {/* @ts-ignore */}
                    <TabsTrigger value="bank" className="data-[state=active]:bg-white data-[state=active]:text-teal-700">Bank Details</TabsTrigger>
                    {/* @ts-ignore */}
                    <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:text-teal-700">My KYC</TabsTrigger>
                    <TabsTrigger value="policy_kyc" className="data-[state=active]:bg-white data-[state=active]:text-teal-700">Policy Members KYC</TabsTrigger>
                    <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:text-teal-700">Activity</TabsTrigger>
                    <TabsTrigger value="actions" className="data-[state=active]:bg-white data-[state=active]:text-teal-700">Admin Actions</TabsTrigger>
                </TabsList>

                {/* PROFILE TAB */}
                <TabsContent value="profile" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3"><CardTitle className="text-base text-slate-700">Personal Information</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {isEditing ? (
                                    <>
                                        <EditRow label="Full Name" value={editForm.name} onChange={v => setEditForm(f => ({ ...f, name: v }))} />
                                        <EditRow label="Email" value={editForm.email} onChange={v => setEditForm(f => ({ ...f, email: v }))} />
                                    </>
                                ) : (
                                    <>
                                        <Row label="Full Name" value={user.name} />
                                        <Row label="Email" value={user.email} />
                                    </>
                                )}
                                <Row label="Date of Birth" value={fmt(user.dob)} />
                                <Row label="Gender" value={user.gender || '—'} />
                                <Row label="User Type" value={user.type} />
                                {isEditing && user.type === 'Employee' ? (
                                    <>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-slate-500">Department</Label>
                                            <Select value={editForm.departmentId} onValueChange={v => setEditForm(f => ({ ...f, departmentId: v }))}>
                                                <SelectTrigger className="bg-white border-slate-200"><SelectValue placeholder="Select Department" /></SelectTrigger>
                                                <SelectContent>
                                                    {departments.map((d: any) => (
                                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <EditRow label="Designation" value={editForm.designation} onChange={v => setEditForm(f => ({ ...f, designation: v }))} />
                                    </>
                                ) : (
                                    <>
                                        <Row label="Designation" value={(user as any).designation || '—'} />
                                        <Row label="Department" value={getDeptName((user as any).departmentId) || '—'} />
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3"><CardTitle className="text-base text-slate-700">Contact & Location</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {isEditing ? (
                                    <>
                                        <EditRow label="Phone" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} />
                                        <EditRow label="City" value={editForm.city} onChange={v => setEditForm(f => ({ ...f, city: v }))} />
                                        <EditRow label="State" value={editForm.state} onChange={v => setEditForm(f => ({ ...f, state: v }))} />
                                    </>
                                ) : (
                                    <>
                                        <Row label="Phone" value={user.phone} />
                                        <Row label="City" value={(user as any).city || '—'} />
                                        <Row label="State" value={(user as any).state || '—'} />
                                    </>
                                )}
                                {/* @ts-ignore */}
                                <Row label="Alt Phone" value={user.altPhone || '—'} />
                                {/* @ts-ignore */}
                                <Row label="2nd Email" value={user.secondEmail || '—'} />
                                {/* @ts-ignore */}
                                <Row label="Landline" value={user.landline || '—'} />
                                {/* @ts-ignore */}
                                <Row label="Country" value={user.country || '—'} />
                                {/* @ts-ignore */}
                                <Row label="Address" value={user.address || '—'} />
                                {/* @ts-ignore */}
                                <Row label="Pincode" value={user.pincode || '—'} />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Partner-specific */}
                    {user.type === 'Referral Partner' && (
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3"><CardTitle className="text-base text-slate-700">Partner Details</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                {/* @ts-ignore */}
                                <Row label="Referral Code" value={user.referralCode || '—'} />
                                {/* @ts-ignore */}
                                <Row label="Commission Rate" value={user.commissionRate ? `${user.commissionRate}%` : '—'} />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* BANK DETAILS TAB */}
                <TabsContent value="bank" className="mt-6">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base text-slate-700">Bank Account Details</CardTitle>
                            <Button variant="outline" size="sm" className="border-slate-200 text-slate-600" onClick={() => toast.info('Edit bank details', { description: 'Bank details editing will be available shortly.' })}><Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit</Button>
                        </CardHeader>
                        <CardContent>
                            {/* @ts-ignore */}
                            {user.bankDetails ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* @ts-ignore */}
                                    <Row label="Bank Name" value={user.bankDetails.bankName || '—'} />
                                    {/* @ts-ignore */}
                                    <Row label="Branch Name" value={user.bankDetails.branchName || '—'} />
                                    {/* @ts-ignore */}
                                    <Row label="Account Holder" value={user.bankDetails.accountHolder || '—'} />
                                    {/* @ts-ignore */}
                                    <Row label="Account Number" value={user.bankDetails.accountNumber || '—'} />
                                    {/* @ts-ignore */}
                                    <Row label="Account Type" value={user.bankDetails.accountType || '—'} />
                                    {/* @ts-ignore */}
                                    <Row label="IFSC Code" value={user.bankDetails.ifscCode || '—'} />
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Landmark className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                    <p>No bank details on file.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* DOCUMENTS TAB */}
                <TabsContent value="documents" className="mt-6">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-3"><CardTitle className="text-base text-slate-700">KYC Documents</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* @ts-ignore */}
                                <DocumentCard title="Aadhaar Card" number={user.kycDetails?.aadhaarNumber} status={user.kycDetails?.aadhaarNumber ? 'uploaded' : 'not_uploaded'} />
                                {/* @ts-ignore */}
                                <DocumentCard title="PAN Card" number={user.kycDetails?.panNumber} status={user.kycDetails?.panNumber ? 'uploaded' : 'not_uploaded'} />
                                {/* @ts-ignore */}
                                <DocumentCard title="Profile Picture" status={user.profilePicture ? 'uploaded' : 'not_uploaded'} />
                            </div>

                            {/* @ts-ignore */}
                            {user.kycDetails && (
                                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">Overall KYC Status</span>
                                        {/* @ts-ignore */}
                                        <Badge className={`text-xs border ${KYC_STYLES[user.kycDetails.status]}`}>{user.kycDetails.status}</Badge>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* POLICY MEMBERS KYC TAB — Enhanced */}
                <TabsContent value="policy_kyc" className="mt-6 space-y-4">
                    {loadingKyc ? (
                        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
                    ) : kycMembers.length === 0 ? (
                        <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="py-10 text-center text-slate-400">No policy members found for this user.</CardContent></Card>
                    ) : kycMembers.map((member: any) => {
                        const kyc = member.kyc;
                        const hasKyc = !!kyc && kyc.kycSubmitted;
                        const hasPendingReq = !!member.pendingEditRequest;

                        return (
                            <Card key={member.id} className="bg-white border-slate-200 shadow-sm overflow-hidden">
                                {/* Card header */}
                                <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${hasKyc ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                            {hasKyc
                                                ? <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                : <ShieldAlert className="w-5 h-5 text-amber-500" />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{member.fullName || 'Name Pending'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge variant="outline" className="text-[10px]">{member.relation}</Badge>
                                                <span className="text-xs text-slate-400 font-mono">{member.cardId}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasPendingReq && (
                                            <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">
                                                Edit Requested
                                            </Badge>
                                        )}
                                        <Badge className={`text-xs border ${
                                            kyc?.adminVerified ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                            : hasKyc ? 'bg-blue-100 text-blue-700 border-blue-200'
                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                        }`}>
                                            {kyc?.adminVerified ? 'Admin Verified' : hasKyc ? 'Submitted' : 'Not Submitted'}
                                        </Badge>
                                        {hasKyc && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 text-xs border-teal-200 text-teal-700 hover:bg-teal-50 gap-1"
                                                onClick={() => handleAdminKycEdit(member)}
                                            >
                                                <Edit3 className="w-3.5 h-3.5" /> Edit KYC
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <CardContent className="p-5">
                                    {hasKyc ? (
                                        <div className="space-y-4">
                                            {/* Photo + Name */}
                                            <div className="flex items-center gap-4">
                                                {kyc.photoUrl ? (
                                                    <img src={kyc.photoUrl} alt="photo" className="w-16 h-16 rounded-xl object-cover border-2 border-slate-100" />
                                                ) : (
                                                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                                                        <UserIcon className="w-7 h-7 text-slate-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-slate-800">{kyc.holderFullName}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        Submitted {new Date(kyc.kycSubmittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </p>
                                                    {kyc.adminNote && (
                                                        <p className="text-xs text-teal-600 mt-0.5">Note: {kyc.adminNote}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Identity docs */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-slate-400 font-medium">Aadhaar</p>
                                                        {kyc.aadhaarFileUrl && (
                                                            <a href={kyc.aadhaarFileUrl} target="_blank" rel="noreferrer" className="text-xs text-teal-600 flex items-center gap-0.5">
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-mono font-semibold text-slate-800 mt-1">
                                                        {kyc.aadhaarDeclaration ? 'Self-declared' : (kyc.aadhaarNumber || '—')}
                                                    </p>
                                                </div>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-xs text-slate-400 font-medium">PAN</p>
                                                        {kyc.panFileUrl && (
                                                            <a href={kyc.panFileUrl} target="_blank" rel="noreferrer" className="text-xs text-teal-600 flex items-center gap-0.5">
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-mono font-semibold text-slate-800 mt-1">
                                                        {kyc.panDeclaration ? 'Self-declared' : (kyc.panNumber || '—')}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Pending request banner */}
                                            {hasPendingReq && (
                                                <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                                                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                                                    <div>
                                                        <p className="font-semibold">Pending edit request from customer</p>
                                                        <p className="text-xs mt-0.5">&ldquo;{member.pendingEditRequest.reason}&rdquo;</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 text-amber-700 bg-amber-50 rounded-xl p-4 border border-amber-200">
                                            <ShieldAlert className="w-5 h-5 shrink-0" />
                                            <p className="text-sm">KYC has not been submitted by this member yet. They will be prompted to fill it before accessing any services.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                {/* Admin KYC Direct Edit Modal */}
                {kycEditModal.open && (
                    <Dialog open={kycEditModal.open} onOpenChange={o => setKycEditModal(prev => ({ ...prev, open: o }))}>
                        <DialogContent className="bg-white border-slate-200 max-w-lg">
                            <DialogHeader>
                                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 -mx-6 -mt-6 px-6 py-5 rounded-t-lg mb-4">
                                    <DialogTitle className="text-white text-lg flex items-center gap-2">
                                        <Edit3 className="w-5 h-5" /> Edit KYC Details
                                    </DialogTitle>
                                    <p className="text-teal-100 text-sm mt-1">
                                        {kycEditModal.member?.fullName} ({kycEditModal.member?.relation})
                                    </p>
                                </div>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p className="text-xs text-slate-400">Leave fields blank to keep existing values.</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-1.5">
                                        <Label>Full Name</Label>
                                        <Input placeholder="Updated name..." value={kycEditForm.holderFullName} onChange={e => setKycEditForm(f => ({ ...f, holderFullName: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>Aadhaar Number</Label>
                                        <Input placeholder="12 digits..." value={kycEditForm.aadhaarNumber} onChange={e => setKycEditForm(f => ({ ...f, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) }))} className="font-mono" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label>PAN Number</Label>
                                        <Input placeholder="ABCDE1234F" value={kycEditForm.panNumber} onChange={e => setKycEditForm(f => ({ ...f, panNumber: e.target.value.toUpperCase().slice(0, 10) }))} className="font-mono uppercase" />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <Label>Admin Note</Label>
                                        <Input placeholder="Reason for this change..." value={kycEditForm.adminNote} onChange={e => setKycEditForm(f => ({ ...f, adminNote: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="mt-2">
                                <Button variant="outline" onClick={() => setKycEditModal({ open: false, member: null })}>Cancel</Button>
                                <Button onClick={handleSaveAdminKyc} disabled={savingKyc} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                                    {savingKyc ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}

                {/* ACTIVITY TAB */}
                <TabsContent value="activity" className="mt-6">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-3"><CardTitle className="text-base text-slate-700">Recent Activity</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                {[
                                    { action: 'Login Successful', desc: 'Logged in from Chrome on Windows', time: '2 hours ago' },
                                    // @ts-ignore
                                    { action: 'Plan Renewed', desc: `${user.planName || 'Health Plan'} renewed for 12 months`, time: '5 days ago' },
                                    { action: 'Profile Updated', desc: 'Phone number changed', time: '1 week ago' },
                                    { action: 'Service Request', desc: 'Consultation request created #SR-1024', time: '2 weeks ago' },
                                    { action: 'Document Uploaded', desc: 'Aadhaar card uploaded for verification', time: '1 month ago' },
                                ].map((a, i) => (
                                    <div key={i} className="flex items-start gap-3 py-3 relative">
                                        {i < 4 && <div className="absolute left-[15px] top-[40px] bottom-0 w-px bg-slate-200" />}
                                        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0 z-10">
                                            <Clock className="h-3.5 w-3.5 text-teal-600" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800">{a.action}</p>
                                            <p className="text-xs text-slate-500">{a.desc}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{a.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ADMIN ACTIONS TAB */}
                <TabsContent value="actions" className="mt-6 space-y-6">
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardHeader className="pb-3"><CardTitle className="text-base text-slate-700">Quick Actions</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Enable/Disable */}
                            <ActionCard
                                title={user.status === 'active' ? 'Disable User' : 'Enable User'}
                                desc={user.status === 'active' ? 'Temporarily deactivate this user account.' : 'Reactivate this user account.'}
                                icon={user.status === 'active' ? UserX : UserCheck}
                                color={user.status === 'active' ? 'text-red-600' : 'text-emerald-600'}
                                onClick={handleToggleStatus}
                            />

                            {/* Activate Plan */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <RefreshCw className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-slate-800">Activate Plan from Backend</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Force-activate the user's plan without payment flow.</p>
                                        <div className="mt-3">
                                            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                                                <SelectTrigger className="bg-white border-slate-200 text-slate-700 h-8 text-sm">
                                                    <SelectValue placeholder="Select a plan" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {plans.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button 
                                                size="sm" 
                                                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white w-full" 
                                                onClick={handleActivatePlan}
                                                disabled={!selectedPlanId}
                                            >
                                                Activate Plan
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resend via WhatsApp */}
                            <ActionCard
                                title="Resend Credentials (WhatsApp)"
                                desc="Send login credentials to user via WhatsApp."
                                icon={Send}
                                color="text-green-600"
                                onClick={() => handleResend('whatsapp')}
                            />

                            {/* Resend via Email */}
                            <ActionCard
                                title="Resend Credentials (Email)"
                                desc="Send login credentials to user via Email."
                                icon={Mail}
                                color="text-blue-600"
                                onClick={() => handleResend('email')}
                            />
                        </CardContent>
                    </Card>

                    {/* Plan Change */}
                    {user.type === 'Customer' && (
                        <Card className="bg-white border-slate-200 shadow-sm">
                            <CardHeader className="pb-3"><CardTitle className="text-base text-slate-700">Change User Plan</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                        {/* @ts-ignore */}
                                        <p className="text-sm text-slate-600 mb-2">Current Plan: <strong>{user.planName || 'None'}</strong></p>
                                        <Select onValueChange={handleChangePlan}>
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-700"><SelectValue placeholder="Select new plan" /></SelectTrigger>
                                            <SelectContent className="bg-white border-slate-200 text-slate-700">
                                                <SelectItem value="plan_silver">Silver Health Plan</SelectItem>
                                                <SelectItem value="plan_gold">Gold Health Plan</SelectItem>
                                                <SelectItem value="plan_platinum">Platinum Health Plan</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-2 border-b border-slate-100 last:border-0">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-800">{value}</span>
        </div>
    );
}

function EditRow({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
    return (
        <div className="flex justify-between py-2 border-b border-slate-100 last:border-0 items-center gap-2">
            <span className="text-sm text-slate-500">{label}</span>
            <Input 
                value={value} 
                onChange={e => onChange(e.target.value)} 
                className="w-48 h-7 text-sm bg-white border-slate-200" 
            />
        </div>
    );
}

function DocumentCard({ title, number, status, documentUrl, onUpload }: { title: string; number?: string; status: string; documentUrl?: string; onUpload?: (url: string) => void }) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'documents');
            formData.append('folder', 'kyc');

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.success && result.data?.url) {
                if (onUpload) {
                    onUpload(result.data.url);
                }
                toast.success(`${title} uploaded successfully`);
            } else {
                toast.error(result.error || 'Upload failed');
            }
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.jpg,.jpeg,.png,.doc,.docx,.heic,.heif,.webp"
                onChange={handleFileChange}
                className="hidden"
            />
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <Badge className={`text-[10px] ${status === 'uploaded' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {status === 'uploaded' ? 'Uploaded' : 'Not Uploaded'}
                </Badge>
            </div>
            {number && <p className="text-xs font-mono text-slate-500">{number}</p>}
            <div className="flex gap-2 mt-3">
                {status === 'uploaded' && documentUrl ? (
                    <Button variant="outline" size="sm" className="text-xs border-slate-200 text-slate-600" onClick={() => window.open(documentUrl, '_blank')}>
                        <Eye className="mr-1 h-3 w-3" /> View
                    </Button>
                ) : (
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs border-slate-200 text-slate-600" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Upload className="mr-1 h-3 w-3" />} 
                        Upload
                    </Button>
                )}
            </div>
        </div>
    );
}

function ActionCard({ title, desc, icon: Icon, color, onClick }: { title: string; desc: string; icon: any; color: string; onClick: () => void }) {
    return (
        <button onClick={onClick} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-left w-full">
            <Icon className={`h-5 w-5 ${color} shrink-0 mt-0.5`} />
            <div>
                <p className="text-sm font-medium text-slate-800">{title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
            </div>
        </button>
    );
}
