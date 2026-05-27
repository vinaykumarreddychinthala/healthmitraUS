'use client';

import React, { useState, useEffect, use } from 'react';
import { User } from '@/types/user';
import { getUser, toggleUserStatus, changePlan, resendCredentials, activateNewPlan, getDepartments, updateUser, getUserPolicyMembers } from '@/app/actions/users';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft, Edit2, Mail, Phone, Clock, Shield, UserX, UserCheck,
    MapPin, Globe, CreditCard, FileText, Send, Loader2, RefreshCw,
    Calendar, User as UserIcon, Landmark, Upload, Eye, Save, X
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
            if (res.success && res.data) {
                setPolicyMembers(res.data);
            }
            setLoadingMembers(false);
        };
        loadMembers();
    }, [id]);

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

                {/* POLICY MEMBERS KYC TAB */}
                <TabsContent value="policy_kyc" className="mt-6 space-y-6">
                    {loadingMembers ? (
                        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
                    ) : policyMembers.length === 0 ? (
                        <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="py-10 text-center text-slate-400">No policy members found.</CardContent></Card>
                    ) : (
                        policyMembers.map((member: any) => {
                            const kycArray = Array.isArray(member.policy_holder_kyc) ? member.policy_holder_kyc : (member.policy_holder_kyc ? [member.policy_holder_kyc] : []);
                            const kyc = kycArray[0] || null;
                            const isSubmitted = kyc?.kyc_submitted;
                            const isVerified = kyc?.admin_verified;
                            
                            return (
                            <Card key={member.id} className="bg-white border-slate-200 shadow-sm">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base text-slate-700">{member.full_name || 'Pending Name'} ({member.relation})</CardTitle>
                                        <p className="text-xs text-slate-500 mt-1">E-Card Status: <Badge variant="outline" className="text-[10px] ml-1">{member.status}</Badge></p>
                                    </div>
                                    <Badge className={`text-xs border ${isVerified ? 'bg-emerald-100 text-emerald-700' : (isSubmitted ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500')}`}>
                                        {isVerified ? 'Verified' : (isSubmitted ? 'Pending Admin' : 'Not Submitted')}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    {kyc ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Row label="Aadhaar" value={kyc.aadhaar_declaration ? 'Self-Declared' : (kyc.aadhaar_number || 'N/A')} />
                                                <Row label="PAN" value={kyc.pan_declaration ? 'Self-Declared' : (kyc.pan_number || 'N/A')} />
                                            </div>
                                            {kyc.photo_url && (
                                                <div className="mt-2">
                                                    <span className="text-sm text-slate-500 block mb-2">Photo Document</span>
                                                    <a href={kyc.photo_url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline text-sm flex items-center gap-1">
                                                        <Eye className="h-4 w-4" /> View Document
                                                    </a>
                                                </div>
                                            )}
                                            {kyc.aadhaar_file_url && (
                                                <div className="mt-2">
                                                    <span className="text-sm text-slate-500 block mb-2">Aadhaar Document</span>
                                                    <a href={kyc.aadhaar_file_url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline text-sm flex items-center gap-1">
                                                        <Eye className="h-4 w-4" /> View Document
                                                    </a>
                                                </div>
                                            )}
                                            {kyc.pan_file_url && (
                                                <div className="mt-2">
                                                    <span className="text-sm text-slate-500 block mb-2">PAN Document</span>
                                                    <a href={kyc.pan_file_url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline text-sm flex items-center gap-1">
                                                        <Eye className="h-4 w-4" /> View Document
                                                    </a>
                                                </div>
                                            )}
                                            {!isVerified && isSubmitted && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={async () => {
                                                        const res = await fetch(`/api/admin/kyc/${member.id}/verify`, { method: 'POST' });
                                                        if (res.ok) {
                                                            toast.success('KYC Verified');
                                                            setPolicyMembers(prev => prev.map(p => {
                                                                if (p.id === member.id) {
                                                                    const updatedKyc = { ...kyc, admin_verified: true };
                                                                    return { ...p, policy_holder_kyc: [updatedKyc] };
                                                                }
                                                                return p;
                                                            }));
                                                        } else {
                                                            toast.error('Failed to verify');
                                                        }
                                                    }}>
                                                        <Shield className="h-4 w-4 mr-2" /> Approve Verification
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500">KYC has not been submitted by this member yet.</p>
                                    )}
                                </CardContent>
                            </Card>
                        )})
                    )}
                </TabsContent>

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
