'use client';

import React, { useState, useCallback } from 'react';
import ECardFlip from '@/components/client/e-cards/ECardFlip';
import GenerateECardWizard from '@/components/client/e-cards/GenerateECardWizard';
import PolicyHolderKYCModal from '@/components/client/e-cards/PolicyHolderKYCModal';
import { ECardMember } from '@/types/ecard';
import { CreditCard, Clock, AlertTriangle, Plus, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

interface ECardsViewProps {
    initialCards: any[];
    availableMembers: any[];
}

export function ECardsView({ initialCards, availableMembers }: ECardsViewProps) {
    const [cards, setCards] = useState<ECardMember[]>(initialCards.map(c => ({
        id: c.id,
        name: c.member_name || c.name || 'Unknown',
        relation: c.relation || 'Self',
        dob: c.dob,
        age: c.age,
        gender: c.gender,
        bloodGroup: c.blood_group,
        memberId: c.member_id,
        planId: c.plan_id,
        planName: c.plan_name || 'Health Plan',
        planPrice: c.plan_price,
        validFrom: c.valid_from || new Date().toISOString(),
        validTill: c.valid_till || '2025-12-31',
        policyNo: c.policy_number,
        issuedDate: c.issued_date || new Date().toISOString(),
        emergencyContact: c.emergency_contact || '1800-123-4567',
        coverageAmount: c.coverage_amount,
        status: (c.status as any) || 'pending',
        cardUniqueId: c.card_unique_id || `HM-${c.id.substr(0, 8).toUpperCase()}`,
        planDescription: 'Comprehensive health coverage',
        planFeatures: Array.isArray(c.plan_features) ? c.plan_features : ['Cashless Hospitalization', '24/7 Support'],
        // KYC fields passed through
        kycSubmitted: c.kycSubmitted || false,
    })));

    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // KYC Modal state
    const [kycModal, setKycModal] = useState<{ open: boolean; memberId: string; memberName: string }>({
        open: false, memberId: '', memberName: ''
    });

    // KYC status cache: memberId → boolean
    const [kycStatusMap, setKycStatusMap] = useState<Record<string, boolean | 'loading'>>({});

    const openKYCModal = useCallback((card: ECardMember) => {
        setKycModal({ open: true, memberId: card.id, memberName: card.name });
    }, []);

    const handleDownload = useCallback((card: ECardMember, type: 'download-pdf' | 'download-img') => {
        // Placeholder for actual PDF/image generation
        toast.success(`Downloading ${type === 'download-pdf' ? 'PDF' : 'Image'} for ${card.name}...`);
        // TODO: Call PDF generation API
    }, []);

    const checkKYCAndProceed = useCallback(async (card: ECardMember, action: 'download-pdf' | 'download-img') => {
        const cached = kycStatusMap[card.id];

        // Use cache if available
        if (cached === true) {
            handleDownload(card, action);
            return;
        }
        if (cached === false) {
            openKYCModal(card);
            return;
        }

        // Fetch KYC status
        setKycStatusMap(prev => ({ ...prev, [card.id]: 'loading' }));
        try {
            const res = await fetch(`/api/kyc?memberId=${card.id}`);
            const data = await res.json();
            const submitted = data.kycSubmitted === true;
            setKycStatusMap(prev => ({ ...prev, [card.id]: submitted }));
            if (submitted) {
                handleDownload(card, action);
            } else {
                openKYCModal(card);
            }
        } catch {
            toast.error('Failed to check KYC status. Please try again.');
            setKycStatusMap(prev => { const next = { ...prev }; delete next[card.id]; return next; });
        }
    }, [kycStatusMap, handleDownload, openKYCModal]);

    const handleKYCSuccess = (memberId: string) => {
        setKycStatusMap(prev => ({ ...prev, [memberId]: true }));
        toast.success('KYC complete! You can now download your E-Card.');
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    const handleCardSuccess = () => {
        toast.success('E-Card generated successfully!', {
            description: 'Card has been emailed to you and is now ready for download.'
        });
    };

    const activeCount = cards.filter(c => c.status === 'active').length;
    const pendingCount = availableMembers.filter(m => !m.hasCard).length;

    // Check if ANY card has submitted KYC (to show overall status banner)
    const anyKYCPending = cards.some(c => c.status === 'active' && kycStatusMap[c.id] === false);

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My E-Cards</h1>
                    <p className="text-slate-500">Download and manage your health insurance cards</p>
                </div>
                <button
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-teal-200 transition-all hover:-translate-y-0.5"
                >
                    <Plus size={18} /> Generate Card
                </button>
            </div>

            {/* KYC Reminder Banner — shown if any card has unsubmitted KYC */}
            {cards.filter(c => c.status === 'active').length > 0 && (
                <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-amber-900">Complete Policy Holder Details to Download E-Card</p>
                        <p className="text-amber-700 text-sm mt-0.5">
                            Click <strong>Download PDF</strong> or <strong>Download Image</strong> below to be guided through the one-time KYC process. This is required before downloading or using any services.
                        </p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" /> Required Once
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
                        <p className="text-sm text-slate-500 font-medium">Active Cards</p>
                        <p className="text-2xl font-bold text-slate-800">{activeCount}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Pending</p>
                        <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">KYC Verified</p>
                        <p className="text-2xl font-bold text-slate-800">
                            {Object.values(kycStatusMap).filter(v => v === true).length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {cards.map(card => (
                    <ECardFlip
                        key={card.id}
                        card={card}
                        kycStatus={kycStatusMap[card.id]}
                        onDownloadClick={(type) => checkKYCAndProceed(card, type)}
                        onCompleteKycClick={() => openKYCModal(card)}
                    />
                ))}
            </div>

            {/* Wizard Modal */}
            <GenerateECardWizard
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                onSuccess={handleCardSuccess}
                availableMembers={availableMembers}
            />

            {/* KYC Modal */}
            <PolicyHolderKYCModal
                isOpen={kycModal.open}
                onClose={() => setKycModal({ open: false, memberId: '', memberName: '' })}
                memberId={kycModal.memberId}
                memberName={kycModal.memberName}
                onSuccess={() => handleKYCSuccess(kycModal.memberId)}
            />
        </div>
    );
}
