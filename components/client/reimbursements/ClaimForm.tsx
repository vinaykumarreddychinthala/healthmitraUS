'use client';

import React, { useState } from 'react';
import { Upload, X, CheckCircle, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createClaim } from '@/lib/api/client';

interface ClaimFormProps {
    userProfile: any;
    policyMembers?: any[];
}

export default function ClaimForm({ userProfile, policyMembers }: ClaimFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        patientName: '',
        hospitalName: '',
        treatmentDate: '',
        amount: '',
        diagnosis: '',
        files: [] as File[]
    });

    const selectedMember = (policyMembers || []).find(m => m.id === formData.patientName);
    const kycArray = selectedMember ? (Array.isArray(selectedMember.policy_holder_kyc) ? selectedMember.policy_holder_kyc : (selectedMember.policy_holder_kyc ? [selectedMember.policy_holder_kyc] : [])) : [];
    const kyc = kycArray[0] || null;
    const isKycVerified = selectedMember ? !!kyc?.admin_verified : true;
    const isKycSubmitted = selectedMember ? !!kyc?.kyc_submitted : false;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedMember && !isKycVerified) {
            toast.error('Reimbursement Locked', {
                description: 'You cannot submit a claim for this member until their E-Card KYC is verified.'
            });
            return;
        }
        setIsSubmitting(true);

        try {
            // Map form data to DB schema
            const claimData = {
                type: 'medical_reimbursement', // Default type or add selector
                patient_name: selectedMember ? (selectedMember.full_name || selectedMember.relation) : formData.patientName,
                hospital_name: formData.hospitalName,
                treatment_date: formData.treatmentDate,
                amount: parseFloat(formData.amount),
                diagnosis: formData.diagnosis,
                status: 'pending',
                plan_id: selectedMember?.plan_id || null,
                plan_name: selectedMember?.plan_name || null,
                created_at: new Date().toISOString()
            };

            const { error } = await createClaim(claimData);

            if (error) throw error;

            toast.success('Claim Submitted Successfully', {
                description: 'Your claim has been recorded and is pending review.'
            });
            router.push('/reimbursements');
        } catch (error) {
            console.error(error);
            toast.error('Failed to submit claim. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <button type="button" onClick={() => router.back()} className="p-1 hover:bg-slate-200 rounded text-slate-500">
                    <ChevronLeft size={20} />
                </button>
                <h2 className="font-bold text-slate-800">Submit New Claim</h2>
            </div>

            <div className="p-6 space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Patient Name *</label>
                        <select
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all text-slate-800"
                            value={formData.patientName}
                            onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                        >
                            <option value="">Select Patient</option>
                            {(!policyMembers || policyMembers.length === 0) ? (
                                <option value={userProfile?.full_name || 'Myself'}>{userProfile?.full_name || 'Myself'} (Self)</option>
                            ) : (
                                policyMembers.map((member: any) => (
                                    <option key={member.id} value={member.id}>
                                        {member.full_name || `Card Slot (${member.relation})`} ({member.relation})
                                    </option>
                                ))
                            )}
                        </select>
                        {selectedMember && !isKycVerified && (
                            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-1">
                                <p className="font-bold flex items-center gap-1">⚠️ Reimbursement Locked</p>
                                <p>
                                    {isKycSubmitted 
                                        ? "KYC has been submitted for this member but is still Pending Admin Verification. Claims can only be processed once verified."
                                        : "KYC has not been submitted for this member. Please complete their KYC details under the E-Cards page before requesting a refund."}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Treatment Date *</label>
                        <input
                            type="date"
                            required
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            value={formData.treatmentDate}
                            onChange={(e) => setFormData({ ...formData, treatmentDate: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Hospital / Provider Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Apollo Hospital"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            value={formData.hospitalName}
                            onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Claim Amount ($) *</label>
                        <input
                            type="number"
                            required
                            placeholder="0.00"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-medium text-slate-700">Diagnosis / Reason *</label>
                        <textarea
                            required
                            placeholder="Describe the condition or reason for treatment..."
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all resize-none h-24"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-700">Upload Documents *</label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 transition-colors text-center cursor-pointer">
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Upload size={20} />
                        </div>
                        <p className="text-sm text-slate-600 font-medium">Click to upload bills & reports</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (Max 5MB)</p>
                    </div>
                </div>

            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || (selectedMember && !isKycVerified)}
                    className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium shadow-lg shadow-teal-200 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Claim'}
                    {!isSubmitting && <CheckCircle size={18} />}
                </button>
            </div>
        </form>
    );
}
