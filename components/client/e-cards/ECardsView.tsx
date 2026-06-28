'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ECardFlip from '@/components/client/e-cards/ECardFlip';
import PolicyHolderKYCModal from '@/components/client/e-cards/PolicyHolderKYCModal';
import KYCEditRequestModal from '@/components/client/e-cards/KYCEditRequestModal';
import KYCDetailsReadOnly from '@/components/client/e-cards/KYCDetailsReadOnly';
import { ECardMember } from '@/types/ecard';
import {
    CreditCard, Clock, ShieldCheck, ShieldAlert, Plus,
    ChevronRight, CheckCircle2, AlertCircle, Lock, UserPlus, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';

interface ECardsViewProps {
    initialCards: any[];
    availableMembers: any[];
}

export function ECardsView({ initialCards, availableMembers }: ECardsViewProps) {
    const searchParams = useSearchParams();

    // Check if redirected here with an error
    useEffect(() => {
        if (searchParams?.get('error') === 'verification_required') {
            toast.error('Admin Verification Required', {
                description: 'You cannot access reimbursements until at least one card is verified by an admin.'
            });
        }
    }, [searchParams]);

    const [cards, setCards] = useState<ECardMember[]>(initialCards.map(c => {
        // Format a YYYY-MM-DD date string to DD/MM/YYYY for consistent display
        const formatDate = (raw: string | null | undefined): string => {
            if (!raw || raw === 'N/A') return 'N/A';
            // Handle ISO strings like "2026-06-18T00:00:00Z"
            const datePart = raw.split('T')[0];
            const parts = datePart.split('-');
            if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            return raw;
        };

        return {
            id: c.id,
            name: c.member_name || c.name || 'Unknown',
            relation: c.relation || 'Self',
            dob: c.dob,
            age: c.dob ? Math.floor((new Date().getTime() - new Date(c.dob).getTime()) / 31557600000) : c.age,
            gender: c.gender,
            bloodGroup: c.blood_group || '',
            memberId: c.member_id || c.member_id_code || '',
            planId: c.plan_id,
            planName: c.plan_name || 'Health Plan',
            planPrice: c.plan_price,
            validFrom: formatDate(c.valid_from),
            validTill: formatDate(c.valid_till),
            policyNo: c.policy_number || '',
            policyId: c.policy_id || '',
            issuedDate: c.issued_date || new Date().toISOString(),
            emergencyContact: c.emergency_contact || '9818823106',
            coverageAmount: c.coverage_amount,
            status: (c.status as any) || 'pending',
            cardUniqueId: c.card_unique_id || c.card_number || `HM-${c.id.substring(0, 8).toUpperCase()}`,
            planDescription: 'Comprehensive health coverage',
            planFeatures: Array.isArray(c.plan_features) ? c.plan_features : [],
            kycSubmitted: c.kycSubmitted || false,
            adminVerified: c.adminVerified || false,
            photoUrl: c.photo_url || undefined,
        };
    }));

    // KYC data per memberId (for read-only display)
    const [kycDataMap, setKycDataMap] = useState<Record<string, any>>({});

    // KYC modal (for completing KYC)
    const [kycModal, setKycModal] = useState<{ open: boolean; memberId: string; memberName: string }>({
        open: false, memberId: '', memberName: ''
    });

    // Edit request modal
    const [editReqModal, setEditReqModal] = useState<{ open: boolean; memberId: string; memberName: string }>({
        open: false, memberId: '', memberName: ''
    });

    // KYC details read-only view
    const [kycViewModal, setKycViewModal] = useState<{ open: boolean; memberId: string; memberName: string }>({
        open: false, memberId: '', memberName: ''
    });

    // Refresh KYC data on mount
    useEffect(() => {
        const fetchAll = async () => {
            for (const card of cards) {
                if (card.kycSubmitted) {
                    try {
                        const res = await fetch(`/api/kyc?memberId=${card.id}`);
                        const data = await res.json();
                        if (data.data) {
                            setKycDataMap(prev => ({ ...prev, [card.id]: data.data }));
                        }
                    } catch (e) {
                        console.error('Failed to fetch KYC data for', card.id);
                    }
                }
            }
        };
        fetchAll();
    }, [cards]);

    const openKYCModal = useCallback((card: ECardMember) => {
        setKycModal({ open: true, memberId: card.id, memberName: card.name === 'Unknown' ? card.relation : card.name });
    }, []);

    const handleDownload = useCallback((card: ECardMember, type: 'download-pdf' | 'download-img') => {
        toast.success(`Downloading ${type === 'download-pdf' ? 'PDF' : 'Image'} for ${card.name}...`);
    }, []);

    const handleKYCSuccess = (memberId: string) => {
        setCards(prev => prev.map(c => c.id === memberId ? { ...c, kycSubmitted: true, status: 'active' } : c));
        toast.success('Details submitted! Your card is now generated.', {
            description: 'If you need to change anything, use the "Request Edit" button.',
            duration: 5000,
        });
        setTimeout(() => window.location.reload(), 1500);
    };

    const pendingCards = useMemo(() => cards.filter(c => !c.kycSubmitted), [cards]);
    const awaitingAdminCards = useMemo(() => cards.filter(c => c.kycSubmitted && !c.adminVerified), [cards]);
    const verifiedCards = useMemo(() => cards.filter(c => c.adminVerified), [cards]);

    // Group by plan name to display exactly what they bought
    const planGroups = useMemo(() => {
        const groups = new Map<string, ECardMember[]>();
        cards.forEach(c => {
            if (!groups.has(c.planName)) groups.set(c.planName, []);
            groups.get(c.planName)!.push(c);
        });
        return groups;
    }, [cards]);

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My E-Cards</h1>
                    <p className="text-slate-500">Manage your health insurance cards and family details</p>
                </div>
            </div>

            {/* ══ Strict KYC Gate Banner ══ */}
            {pendingCards.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 via-rose-50 to-red-50 p-6">
                    <div className="absolute -right-8 -top-8 w-40 h-40 bg-red-100/60 rounded-full" />
                    <div className="absolute -right-4 -bottom-8 w-24 h-24 bg-rose-100/60 rounded-full" />

                    <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-red-200">
                            <ShieldAlert className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-red-900 text-lg">
                                Complete Member Details to Access Services
                            </h3>
                            <p className="text-red-700 text-sm mt-1">
                                To unlock and access all Dashboard Services, please complete the details for all <strong>({cards.length}) member(s)</strong> included in your plan. <strong>({pendingCards.length}) member profile(s)</strong> is still pending completion. Fill in the required information to continue.
                            </p>
                            <p className="text-red-800 font-semibold text-sm mt-2">
                                Pending Profiles: ({pendingCards.length}) of ({cards.length}) Member(s) Remaining.
                                <button
                                    onClick={() => pendingCards.length > 0 && openKYCModal(pendingCards[0])}
                                    className="underline text-red-600 hover:text-red-800 ml-1 font-bold cursor-pointer inline-block mt-1 sm:mt-0 bg-transparent border-none p-0"
                                >
                                    Download E-Card / Fill Details
                                </button>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Total Plan Slots</p>
                        <p className="text-2xl font-bold text-slate-800">{cards.length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Pending Details</p>
                        <p className="text-2xl font-bold text-slate-800">{pendingCards.length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Admin Verified</p>
                        <p className="text-2xl font-bold text-slate-800">{verifiedCards.length}</p>
                    </div>
                </div>
            </div>

            {/* Display by Plan Groups */}
            {Array.from(planGroups.entries()).map(([planName, planCards]) => {
                // Get policy ID for this plan group (same for all cards in the group)
                const policyId = planCards[0]?.policyId;
                return (
                    <section key={planName} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-3">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{planName}</h2>
                                <p className="text-sm text-slate-500 mt-1">Purchased slots: {planCards.length}</p>
                                {policyId && (
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <Tag size={13} className="text-teal-600" />
                                        <span className="text-xs font-semibold text-slate-600">Policy ID:</span>
                                        <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full tracking-wide">{policyId}</span>
                                    </div>
                                )}
                            </div>
                            {planCards.every(c => c.kycSubmitted) ? (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> All Details Submitted
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-bold rounded-full flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4" /> Incomplete
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {planCards.map(card => {
                                const isPending = !card.kycSubmitted;
                                const isAwaitingVerification = card.kycSubmitted && !card.adminVerified;
                                const isVerified = card.adminVerified;

                                return (
                                    <div key={card.id} className="relative group">
                                        {isPending ? (
                                            // Pending UI - Empty Slot
                                            <div className="h-[240px] rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-6 text-center hover:border-teal-400 hover:bg-teal-50/50 transition-colors">
                                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                                                    <UserPlus className="w-8 h-8 text-slate-500" />
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-700 mb-1">
                                                    {card.relation} Slot
                                                </h3>
                                                <p className="text-sm text-slate-500 mb-5">
                                                    Empty slot. Please fill details to generate the e-card.
                                                </p>
                                                <button
                                                    onClick={() => openKYCModal(card)}
                                                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-teal-200"
                                                >
                                                    Fill Details <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            // Filled Card UI
                                            <div className="space-y-3">
                                                <ECardFlip
                                                    card={card}
                                                    kycStatus={true}
                                                    onDownloadClick={(type) => handleDownload(card, type)}
                                                    onCompleteKycClick={() => { }}
                                                />
                                                {/* Action bar under card */}
                                                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2.5">
                                                        {isVerified ? (
                                                            <>
                                                                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                                                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-emerald-700">Verified by Admin</p>
                                                                    <p className="text-[10px] text-slate-400">Reimbursements active</p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                                                                    <Clock className="w-4 h-4 text-amber-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-semibold text-amber-700">Awaiting Admin Verification</p>
                                                                    <p className="text-[10px] text-slate-400">Details locked</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => setKycViewModal({ open: true, memberId: card.id, memberName: card.name })}
                                                            className="text-xs text-teal-600 hover:text-teal-700 font-medium px-3 py-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                                                        >
                                                            View Details
                                                        </button>
                                                        <button
                                                            onClick={() => setEditReqModal({ open: true, memberId: card.id, memberName: card.name })}
                                                            className="text-xs text-slate-600 hover:text-slate-800 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                                                        >
                                                            Request Edit
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                );
            })}

            {/* KYC Fill Modal */}
            <PolicyHolderKYCModal
                isOpen={kycModal.open}
                onClose={() => setKycModal({ open: false, memberId: '', memberName: '' })}
                memberId={kycModal.memberId}
                memberName={kycModal.memberName}
                onSuccess={() => handleKYCSuccess(kycModal.memberId)}
            />

            {/* KYC Read-Only View Modal */}
            <KYCDetailsReadOnly
                isOpen={kycViewModal.open}
                onClose={() => setKycViewModal({ open: false, memberId: '', memberName: '' })}
                memberId={kycViewModal.memberId}
                memberName={kycViewModal.memberName}
                kycData={kycDataMap[kycViewModal.memberId]}
                onRequestEdit={() => {
                    setKycViewModal({ open: false, memberId: '', memberName: '' });
                    setTimeout(() => setEditReqModal({
                        open: true,
                        memberId: kycViewModal.memberId,
                        memberName: kycViewModal.memberName
                    }), 100);
                }}
            />

            {/* Edit Request Modal */}
            <KYCEditRequestModal
                isOpen={editReqModal.open}
                onClose={() => setEditReqModal({ open: false, memberId: '', memberName: '' })}
                memberId={editReqModal.memberId}
                memberName={editReqModal.memberName}
            />
        </div>
    );
}
