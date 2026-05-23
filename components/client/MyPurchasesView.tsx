'use client';

import React, { useState } from 'react';
import { ShoppingBag, Calendar, CheckCircle, Eye, Download, Users, Edit, Lock, ChevronRight, AlertCircle, CreditCard, RefreshCw, Plus, Smartphone, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import Link from 'next/link';

interface MyPurchasesViewProps {
    purchases: any[];
}



interface MemberFormData {
    name: string;
    dob: string;
    gender: string;
    relation: string;
    bloodGroup: string;
    mobile: string;
}

// Helper function to format date consistently
function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// Calculate age from DOB
function calculateAge(dob: string): number {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

export function MyPurchasesView({ purchases }: MyPurchasesViewProps) {
    const allPurchases = purchases || [];

    const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
    const [isMemberWizardOpen, setIsMemberWizardOpen] = useState(false);
    const [isSavingMember, setIsSavingMember] = useState(false);
    const [memberForm, setMemberForm] = useState<MemberFormData>({
        name: '',
        dob: '',
        gender: '',
        relation: '',
        bloodGroup: '',
        mobile: ''
    });



    // Get active and expired plans separately
    const activePlans = allPurchases.filter(p => p.status === 'active');
    const expiredPlans = allPurchases.filter(p => p.status === 'expired');

    const handleViewDetails = (purchase: any) => {
        setSelectedPurchase(purchase);
        setIsDetailsOpen(true);
    };

    const handleManageMembers = (purchase: any) => {
        setSelectedPurchase(purchase);
        setIsMemberWizardOpen(true);
    };

    const handleAddMemberClick = () => {
        setMemberForm({
            name: '',
            dob: '',
            gender: '',
            relation: '',
            bloodGroup: '',
            mobile: ''
        });
        setIsMemberFormOpen(true);
    };

    const handleSaveMember = async () => {
        if (!memberForm.name || !memberForm.dob || !memberForm.gender || !memberForm.relation) {
            toast.error("Please fill all required fields");
            return;
        }

        setIsSavingMember(true);
        try {
            const { addUserFamilyMember } = await import('@/app/actions/ecards');
            const result = await addUserFamilyMember(selectedPurchase.plan_id, {
                fullName: memberForm.name,
                dob: memberForm.dob,
                gender: memberForm.gender,
                relation: memberForm.relation,
                bloodGroup: memberForm.bloodGroup || undefined,
                contactNumber: memberForm.mobile || undefined
            });

            if (result.success) {
                toast.success("Member added successfully!");
                setIsMemberFormOpen(false);
                // Trigger page refresh to show new member
                window.location.reload();
            } else {
                toast.error(result.error || "Failed to add member");
            }
        } catch (error) {
            toast.error("An error occurred while saving the member.");
        } finally {
            setIsSavingMember(false);
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Purchased Plans</h1>
                    <p className="text-slate-500 text-sm">View plan details and manage policy holder information</p>
                </div>
                <Badge className="bg-slate-100 text-slate-600 shrink-0">
                    {allPurchases.length} Plan{allPurchases.length !== 1 ? 's' : ''}
                </Badge>
            </div>

                <Link href="/shop/plans" className="shrink-0">
                    <Button variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                        <ShoppingBag size={16} className="mr-2" /> Browse More Plans
                    </Button>
                </Link>

            {/* Active Plans Section */}
            {activePlans.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        Active Plans ({activePlans.length})
                    </h2>

                    {activePlans.map((purchase, index) => (
                        <div
                            key={purchase.id}
                            className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${index === 0 ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200'
                                }`}
                        >
                            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-600 border border-teal-100">
                                        <CreditCard size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-lg text-slate-800">{purchase.plan_name}</h3>
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                                <CheckCircle size={10} className="mr-1" /> Active
                                            </Badge>
                                            {index === 0 && (
                                                <Badge className="bg-teal-100 text-teal-700 border-teal-200">
                                                    ⭐ Current Plan
                                                </Badge>
                                            )}
                                        </div>

                                        <p className="text-sm text-slate-500 mt-1 font-mono">Plan ID: {purchase.id}</p>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm">
                                            <span className="flex items-center gap-1.5 text-slate-600">
                                                <Calendar size={14} className="text-slate-400" />
                                                Purchased: <strong>{formatDate(purchase.start_date)}</strong>
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-600">
                                                <Clock size={14} className="text-slate-400" />
                                                Valid till: <strong>{formatDate(purchase.expiry_date)}</strong>
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm">
                                            <span className="flex items-center gap-1.5 text-slate-600">
                                                <Users size={14} className="text-slate-400" />
                                                Members: <strong>{purchase.members_count ?? 1}</strong>/<strong>{purchase.max_members ?? 1}</strong>
                                            </span>
                                            <span className="flex items-center gap-1.5 text-teal-600 font-semibold">
                                                Coverage: ${purchase.coverage_amount?.toLocaleString('en-IN')}
                                            </span>
                                            {/* Plan type badge */}
                                            {(purchase.max_members ?? 1) === 1 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
                                                    👤 Single Member
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                                                    👨‍👩‍👧‍👦 Multi Member · up to {purchase.max_members}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4 lg:mt-0 w-full lg:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDetails(purchase)}
                                        className="text-slate-600 w-full sm:w-auto"
                                    >
                                        <Eye size={14} className="mr-1" /> View Details
                                    </Button>
                                    {/* Only show Manage Members for multi-member plans */}
                                    {(purchase.max_members ?? 1) > 1 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleManageMembers(purchase)}
                                            className="text-slate-600 w-full sm:w-auto"
                                        >
                                            <Users size={14} className="mr-1" /> Manage Members
                                        </Button>
                                    )}
                                    <Link href="/e-cards" className="w-full sm:w-auto">
                                        <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white w-full">
                                            <Smartphone size={14} className="mr-1" /> Get E-Cards
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Expired Plans Section */}
            {expiredPlans.length > 0 && (
                <div className="space-y-4 mt-8">
                    <h2 className="text-lg font-semibold text-slate-500 flex items-center gap-2">
                        <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                        Expired Plans ({expiredPlans.length})
                    </h2>

                    {expiredPlans.map((purchase) => (
                        <div
                            key={purchase.id}
                            className="bg-slate-50 rounded-xl border border-slate-200 p-5 opacity-80"
                        >
                            <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-4">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 rounded-xl bg-slate-100 text-slate-400 border border-slate-200">
                                        <CreditCard size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-lg text-slate-600">{purchase.plan_name}</h3>
                                            <Badge className="bg-red-100 text-red-600 border-red-200">
                                                <XCircle size={10} className="mr-1" /> Expired
                                            </Badge>
                                        </div>

                                        <p className="text-sm text-slate-400 mt-1 font-mono">Plan ID: {purchase.id}</p>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm">
                                            <span className="flex items-center gap-1.5 text-slate-500">
                                                <Calendar size={14} className="text-slate-400" />
                                                Purchased: {formatDate(purchase.start_date)}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-red-500">
                                                <XCircle size={14} />
                                                Expired: {formatDate(purchase.expiry_date)}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-slate-500">
                                            <span className="flex items-center gap-1.5">
                                                <Users size={14} className="text-slate-400" />
                                                Members: {purchase.members_count ?? 1}/{purchase.max_members ?? 1}
                                            </span>
                                            <span>
                                                Coverage: ${purchase.coverage_amount?.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons for Expired */}
                                <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4 lg:mt-0 w-full lg:w-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewDetails(purchase)}
                                        className="text-slate-500 w-full sm:w-auto"
                                    >
                                        <Eye size={14} className="mr-1" /> View Details
                                    </Button>
                                    <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white w-full sm:w-auto">
                                        <RefreshCw size={14} className="mr-1" /> Renew Plan
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No Purchases State */}
            {allPurchases.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                    <ShoppingBag className="mx-auto h-16 w-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-800">No purchases yet</h3>
                    <p className="text-slate-500 mt-2">You haven't purchased any plans or services.</p>
                    <Link href="/plans">
                        <Button className="mt-6 bg-teal-600 hover:bg-teal-700">
                            Browse Plans <ChevronRight size={14} className="ml-1" />
                        </Button>
                    </Link>
                </div>
            )}

            {/* View Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Plan Details</DialogTitle>
                    </DialogHeader>
                    {selectedPurchase && (
                        <div className="space-y-6">
                            <div className={`p-5 rounded-xl text-white ${selectedPurchase.status === 'active'
                                ? 'bg-gradient-to-r from-teal-500 to-cyan-500'
                                : 'bg-gradient-to-r from-slate-500 to-slate-600'
                                }`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold">{selectedPurchase.plan_name}</h3>
                                        <p className="text-white/80 text-sm mt-1">Plan ID: {selectedPurchase.id}</p>
                                    </div>
                                    <Badge className={`${selectedPurchase.status === 'active'
                                        ? 'bg-white/20 text-white'
                                        : 'bg-red-500 text-white'
                                        }`}>
                                        {selectedPurchase.status}
                                    </Badge>
                                </div>
                                <p className="text-2xl font-bold mt-4">
                                    ${selectedPurchase.coverage_amount?.toLocaleString('en-IN')}
                                    <span className="text-sm font-normal text-white/80 ml-2">Coverage</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase">Start Date</p>
                                    <p className="font-bold text-slate-800">{formatDate(selectedPurchase.start_date)}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase">
                                        {selectedPurchase.status === 'expired' ? 'Expired On' : 'Valid Till'}
                                    </p>
                                    <p className={`font-bold ${selectedPurchase.status === 'expired' ? 'text-red-600' : 'text-slate-800'}`}>
                                        {formatDate(selectedPurchase.expiry_date)}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase">Members</p>
                                    <p className="font-bold text-slate-800">{selectedPurchase.members_count ?? 1} / {selectedPurchase.max_members ?? 1}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {(selectedPurchase.max_members ?? 1) === 1 ? '👤 Single Member Plan' : `👨‍👩‍👧‍👦 Multi Member · up to ${selectedPurchase.max_members}`}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-slate-500 uppercase">Status</p>
                                    <p className={`font-bold capitalize ${selectedPurchase.status === 'active' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {selectedPurchase.status}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold mb-3">Plan Benefits</h4>
                                <ul className="space-y-2 text-sm text-slate-600">
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Unlimited Doctor Consultations</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Medicine Discounts up to 25%</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Free Diagnostic Tests (up to $5,000)</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Emergency Ambulance Services</li>
                                    <li className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> 24x7 Health Support</li>
                                </ul>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link href="/invoices" className="flex-1 w-full sm:w-auto">
                                    <Button variant="outline" className="w-full">
                                        <Download size={14} className="mr-2" /> Download Invoice
                                    </Button>
                                </Link>
                                {selectedPurchase.status === 'active' ? (
                                    <Link href="/e-cards" className="flex-1 w-full sm:w-auto">
                                        <Button className="w-full bg-teal-600 hover:bg-teal-700">
                                            Get E-Cards <ChevronRight size={14} className="ml-1" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <Button className="flex-1 w-full sm:w-auto bg-orange-500 hover:bg-orange-600">
                                        <RefreshCw size={14} className="mr-2" /> Renew Plan
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Manage Members Modal */}
            <Dialog open={isMemberWizardOpen} onOpenChange={setIsMemberWizardOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Manage Members - {selectedPurchase?.plan_name}</DialogTitle>
                    </DialogHeader>
                          <div className="space-y-4">
                            {/* Member count header */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <span className="text-sm font-medium text-slate-700">
                                    {(selectedPurchase?.family_members?.length || 0) + 1} / {selectedPurchase?.max_members ?? 1} E-Cards issued
                                </span>
                                {(selectedPurchase?.max_members ?? 1) === 1 ? (
                                    <span className="text-xs px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-semibold">👤 Single Member Plan</span>
                                ) : (
                                    <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">👨‍👩‍👧‍👦 Multi Member</span>
                                )}
                            </div>

                            <div className="space-y-3">
                                {/* Primary (Self) member — always shown */}
                                <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-emerald-500 text-white">
                                            <CheckCircle size={16} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800">Primary Member (Self)</p>
                                            <p className="text-sm text-slate-500">{selectedPurchase?.member_name}</p>
                                        </div>
                                    </div>
                                    <Lock size={14} className="text-slate-400" />
                                </div>

                                {/* Additional family members */}
                                {selectedPurchase?.family_members?.map((member: any, idx: number) => (
                                    <div key={member.id || idx} className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-emerald-500 text-white">
                                                <CheckCircle size={16} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{member.relation}</p>
                                                <p className="text-sm text-slate-500">{member.name}</p>
                                            </div>
                                        </div>
                                        <Lock size={14} className="text-slate-400" />
                                    </div>
                                ))}

                                {/* Add member slot — only for multi plans with remaining slots */}
                                {(selectedPurchase?.max_members ?? 1) > 1 && (
                                    ((selectedPurchase?.family_members?.length || 0) + 1) < (selectedPurchase?.max_members ?? 1) ? (
                                        <div
                                            className="flex items-center justify-center p-4 rounded-lg border border-dashed border-teal-300 bg-teal-50 hover:bg-teal-100 cursor-pointer transition-colors"
                                            onClick={handleAddMemberClick}
                                        >
                                            <div className="flex items-center gap-2 text-teal-700 font-semibold">
                                                <Plus size={18} /> Add New Member
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 text-sm">
                                            <Lock size={14} /> All member slots are filled ({selectedPurchase?.max_members} / {selectedPurchase?.max_members})
                                        </div>
                                    )
                                )}

                                {/* Single member plan — locked state */}
                                {(selectedPurchase?.max_members ?? 1) === 1 && (
                                    <div className="flex items-center justify-center gap-2 p-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm">
                                        <Lock size={14} /> This is a Single Member plan — only 1 E-Card is issued
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <Button variant="outline" onClick={() => setIsMemberWizardOpen(false)} className="flex-1 w-full sm:w-auto">
                                    Close
                                </Button>
                                <Link href="/e-cards" className="flex-1 w-full sm:w-auto">
                                    <Button className="w-full bg-teal-600 hover:bg-teal-700">
                                        <Smartphone size={14} className="mr-2" /> Generate E-Cards
                                    </Button>
                                </Link>
                            </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Member Details Form Modal */}
            <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Member</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                            <strong>⚠️ Important:</strong> Once submitted, these details cannot be changed. Please verify before saving.
                        </div>

                        <div className="space-y-2">
                            <Label>Full Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={memberForm.name}
                                onChange={(e) => setMemberForm(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Enter full name as per ID"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Relation <span className="text-red-500">*</span></Label>
                                <Select value={memberForm.relation} onValueChange={(val) => setMemberForm(prev => ({ ...prev, relation: val }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select relation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Spouse">Spouse</SelectItem>
                                        <SelectItem value="Parent">Parent</SelectItem>
                                        <SelectItem value="Child">Child</SelectItem>
                                        <SelectItem value="Sibling">Sibling</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Date of Birth <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    value={memberForm.dob}
                                    onChange={(e) => setMemberForm(prev => ({ ...prev, dob: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Gender <span className="text-red-500">*</span></Label>
                                <Select value={memberForm.gender} onValueChange={(val) => setMemberForm(prev => ({ ...prev, gender: val }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Blood Group <span className="text-red-500">*</span></Label>
                                <Select value={memberForm.bloodGroup} onValueChange={(val) => setMemberForm(prev => ({ ...prev, bloodGroup: val }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                            <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Mobile <span className="text-red-500">*</span></Label>
                                <Input
                                    type="tel"
                                    value={memberForm.mobile}
                                    onChange={(e) => setMemberForm(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                                    placeholder="10-digit mobile"
                                    maxLength={10}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <Button variant="outline" onClick={() => setIsMemberFormOpen(false)} className="flex-1 w-full sm:w-auto">
                                Cancel
                            </Button>
                            <Button onClick={handleSaveMember} disabled={isSavingMember} className="flex-1 w-full sm:w-auto bg-teal-600 hover:bg-teal-700">
                                <CheckCircle size={14} className="mr-2 shrink-0" /> {isSavingMember ? 'Saving...' : 'Save & Lock'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
