'use client';

import React, { useState, useRef } from 'react';
import { ECardMember } from '@/types/ecard';
import { Download, Share2, Wallet, RefreshCw, Smartphone, Mail, Clock, Shield, Phone, Globe, ChevronRight, QrCode, CheckCircle, ShieldAlert, Loader2, User, Lock } from 'lucide-react';
import EmailECardModal from './EmailECardModal';
import { downloadCardAsImage, downloadCardAsPDF } from '@/lib/cardDrawer';
import { toast } from 'sonner';

interface ECardFlipProps {
    card: ECardMember;
    kycStatus?: boolean | 'loading';
    onDownloadClick?: (type: 'download-pdf' | 'download-img') => void;
    onCompleteKycClick?: () => void;
}

export default function ECardFlip({ card, kycStatus, onDownloadClick, onCompleteKycClick }: ECardFlipProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const frontCardRef = useRef<HTMLDivElement>(null);

    const handleActualDownload = async (type: 'download-pdf' | 'download-img') => {
        const toastId = toast.loading(`Preparing ${type === 'download-pdf' ? 'PDF' : 'image'}...`);
        try {
            const cardData = {
                name: card.name,
                memberId: card.memberId,
                cardUniqueId: card.cardUniqueId,
                relation: card.relation,
                dob: card.dob,
                age: card.age,
                gender: card.gender,
                bloodGroup: card.bloodGroup || '',
                planName: card.planName,
                coverageAmount: card.coverageAmount ?? 0,
                validFrom: card.validFrom,
                validTill: card.validTill,
                emergencyContact: card.emergencyContact || '1800-XXX-XXXX',
                adminVerified: card.adminVerified ?? false,
                photoUrl: card.photoUrl,
            };
            const filename = `HealthMitra_Card_${card.name.replace(/\s+/g, '_')}`;
            if (type === 'download-img') {
                await downloadCardAsImage(cardData, filename);
            } else {
                await downloadCardAsPDF(cardData, filename);
            }
            toast.success(`Downloaded successfully!`, { id: toastId });
            onDownloadClick?.(type);
        } catch (err) {
            console.error('Download error:', err);
            toast.error('Download failed. Please try again.', { id: toastId });
        }
    };

    // If card is pending, show pending state
    if (card.status === 'pending') {
        return (
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-500">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">CARD GENERATION PENDING</h3>
                        <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
                            Please complete member details and submit KYC documents to generate this E-Card
                        </p>
                    </div>

                    <div className="w-full bg-slate-50 p-4 rounded-xl mt-2 border border-slate-100">
                        <div className="text-sm text-left space-y-1">
                            <p><span className="text-slate-500">Member:</span> <span className="font-semibold text-slate-700">{card.name || 'Unassigned'} ({card.relation})</span></p>
                            <p><span className="text-slate-500">Plan:</span> <span className="font-semibold text-slate-700">{card.planName}</span></p>
                        </div>
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onCompleteKycClick?.(); }}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl font-semibold text-sm transition-colors mt-2"
                    >
                        Complete KYC & Activate Card
                    </button>
                </div>
            </div>
        );
    }

    // Calculate coverage display
    const coverageAmount = card.coverageAmount ?? 0;
    const formattedCoverage = coverageAmount > 0 ? `$${(coverageAmount / 100000).toFixed(0)},00,000` : '$0';

    return (
        <div className="w-full perspective-1000 group">
            {/* Container for flip effect */}
            <div
                className={`relative w-full transition-all duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={(e) => {
                    // Only flip to back if it's currently on the front
                    if (!isFlipped) setIsFlipped(true);
                }}
            >

                {/* ==================== FRONT SIDE ==================== */}
                <div className="w-full backface-hidden">
                    <div ref={frontCardRef} className="w-full min-h-[350px] bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 rounded-2xl shadow-2xl p-6 text-white flex flex-col relative overflow-hidden">

                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 w-72 h-72 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-56 h-56 bg-black opacity-10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>
                        <div className="absolute top-1/2 right-0 w-32 h-32 bg-cyan-400 opacity-10 rounded-full blur-2xl"></div>

                        {/* Header */}
                        <div className="flex justify-between items-start z-10 shrink-0">
                            <div>
                                <h3 className="font-bold text-xl tracking-wide">HEALTHMITRA</h3>
                                <p className="text-xs text-teal-100 opacity-90 mt-0.5">Your Health, Our Priority</p>
                            </div>
                            {card.adminVerified ? (
                                <span className="text-xs font-bold px-3 py-1.5 bg-green-400 text-green-900 rounded-full shadow-lg flex items-center gap-1">
                                    <CheckCircle size={12} /> Active
                                </span>
                            ) : (
                                <span className="text-xs font-bold px-3 py-1.5 bg-orange-400 text-orange-900 rounded-full shadow-lg flex items-center gap-1">
                                    <ShieldAlert size={12} /> Verification Pending
                                </span>
                            )}
                        </div>

                        <div className="flex-1 flex flex-col sm:flex-row mt-6 gap-6 z-10 min-h-0">
                            {/* Left Column (Member info) */}
                            <div className="flex-1 flex flex-col justify-between">
                                {/* Member Details */}
                                <div className="flex gap-4">
                                    <div className="w-16 h-20 bg-white/20 rounded-xl flex-shrink-0 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                                        {card.photoUrl ? (
                                            <img src={card.photoUrl} alt={card.name} className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            <User size={32} className="text-white/50" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-xl uppercase tracking-wide">{card.name}</h4>

                                        <div className="mt-2 space-y-1 text-xs">
                                            <p className="text-teal-100">
                                                <span className="text-teal-200">Card ID:</span>{' '}
                                                <span className="font-mono font-bold text-white">{card.cardUniqueId}</span>
                                                <span className="ml-1 text-[9px] bg-white/20 px-1.5 py-0.5 rounded">(Unique)</span>
                                            </p>
                                            <p className="text-teal-100">
                                                <span className="text-teal-200">Member ID:</span>{' '}
                                                <span className="font-mono text-white">{card.memberId}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                {/* Member Info Grid */}
                                <div className="mt-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                        <div>
                                            <p className="text-teal-200 text-[10px]">DOB</p>
                                            <p className="font-semibold">{card.dob}</p>
                                        </div>
                                        <div>
                                            <p className="text-teal-200 text-[10px]">Age</p>
                                            <p className="font-semibold">{card.age} yrs</p>
                                        </div>
                                        <div>
                                            <p className="text-teal-200 text-[10px]">Gender</p>
                                            <p className="font-semibold">{card.gender === 'M' ? 'M' : card.gender === 'F' ? 'F' : 'O'}</p>
                                        </div>
                                        <div>
                                            <p className="text-teal-200 text-[10px]">Blood Group</p>
                                            <p className="font-bold text-lg -mt-0.5">{card.bloodGroup}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-teal-200 text-[10px]">Relation</p>
                                            <p className="font-semibold">{card.relation}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column (Plan, Validity, QR) */}
                            <div className="w-full sm:w-[240px] flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-white/20 pt-4 sm:pt-0 sm:pl-6 shrink-0">
                                {/* Plan & Coverage */}
                                <div>
                                    <p className="text-[10px] text-teal-200 uppercase tracking-wide">Plan</p>
                                    <p className="text-sm font-bold">{card.planName.toUpperCase()}</p>
                                    <p className="text-[10px] text-teal-200 uppercase tracking-wide mt-2">Coverage</p>
                                    <p className="text-sm font-bold">{formattedCoverage}</p>
                                </div>
                                {/* Validity Section */}
                                <div className="mt-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10">
                                    <p className="text-[10px] text-teal-200 uppercase tracking-wider font-semibold mb-1">VALIDITY</p>
                                    <div className="text-xs space-y-1">
                                        <div>
                                            <span className="text-teal-100">From:</span>{' '}
                                            <span className="font-bold text-white">{card.validFrom}</span>
                                        </div>
                                        <div>
                                            <span className="text-teal-100">Till:</span>{' '}
                                            <span className="font-bold text-white">{card.validTill}</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Footer - 24/7 Support & QR */}
                                <div className="mt-4 flex justify-between items-end">
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-[10px] font-bold shadow-lg">
                                            <Clock size={10} />
                                            24/7
                                        </div>
                                        <div className="text-xs">
                                            <p className="text-teal-200 text-[9px]">Support</p>
                                            <p className="font-bold">{card.emergencyContact || '1800-XXX-XXXX'}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-1 rounded-md shadow-lg">
                                        <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-900 rounded-sm flex items-center justify-center">
                                            <QrCode size={20} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tap to Flip Indicator */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 hidden sm:block">
                            <p className="text-[10px] text-white/60 flex items-center gap-1 animate-pulse">
                                Tap to flip <ChevronRight size={10} />
                            </p>
                        </div>
                    </div>
                </div>

                {/* ==================== BACK SIDE ==================== */}
                <div className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180">
                    <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 flex flex-col relative overflow-hidden text-slate-800">

                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4 shrink-0">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 uppercase tracking-wide">Plan Benefits & Contacts</h3>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-200 transition-colors"
                            >
                                ← Flip Back
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col sm:flex-row gap-6 min-h-0">
                            {/* Left Column: Key Benefits */}
                            <div className="flex-1 flex flex-col min-h-0">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 shrink-0">KEY BENEFITS:</p>
                                <div className="flex-1 overflow-y-auto min-h-0 pr-2">
                                    <ul className="space-y-1.5 text-sm text-slate-600">
                                        {(card.planFeatures && card.planFeatures.length > 0) ? card.planFeatures.map((benefit, idx) => (
                                            <li key={idx} className="flex gap-2 items-start">
                                                <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                                                <span>{benefit}</span>
                                            </li>
                                        )) : [
                                            'Cashless hospitalization at 1000+ hospitals',
                                            'OPD coverage up to $25,000/year',
                                            'Diagnostic tests up to $15,000/year',
                                            'Medicine reimbursement up to $20,000/year',
                                            'Free annual health checkup (1 per member)',
                                            'Unlimited telemedicine consultations',
                                            'Emergency ambulance service',
                                            '24/7 medical assistance hotline'
                                        ].map((benefit, idx) => (
                                            <li key={idx} className="flex gap-2 items-start">
                                                <span className="text-green-500 font-bold flex-shrink-0">✓</span>
                                                <span>{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Right Column: Plan details, Emergency Contacts, Footer */}
                            <div className="w-full sm:w-[260px] shrink-0 flex flex-col border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                                {/* Plan Name & Premium */}
                                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border border-teal-100 mb-6 shrink-0">
                                    <p className="font-bold text-teal-800 text-lg">{card.planName}</p>
                                    <p className="text-sm text-teal-600 mt-1">Annual Premium: <span className="font-bold">${card.planPrice ? card.planPrice.toLocaleString('en-IN') : 'N/A'}</span></p>
                                </div>

                                {/* Emergency Contacts */}
                                <div className="shrink-0">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">EMERGENCY CONTACTS:</p>
                                    <div className="space-y-2 text-sm text-slate-700">
                                        <p className="flex items-center gap-2">
                                            <Phone size={14} className="text-teal-500" />
                                            <span>Helpline:</span>
                                            <span className="font-bold">{card.emergencyContact || '1800-XXX-XXXX'}</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <Mail size={14} className="text-teal-500" />
                                            <span className="truncate">support@healthmitra.com</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <Globe size={14} className="text-teal-500" />
                                            <span className="truncate">www.healthmitra.com</span>
                                        </p>
                                    </div>
                                </div>

                                {/* Footer Info */}
                                <div className="mt-auto pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs text-slate-500 shrink-0">
                                    <div>
                                        <p>Policy No: <span className="text-slate-700 font-medium">{card.policyNo}</span></p>
                                        <p className="mt-0.5">Issued By: <span className="text-slate-700 font-medium">HealthMitra</span></p>
                                    </div>
                                    {card.adminVerified ? (
                                        <div className="flex items-center gap-1 text-teal-600 self-start bg-teal-50 px-2 py-1 rounded-lg">
                                            <Shield size={14} />
                                            <span className="font-semibold">Verified</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-orange-600 self-start bg-orange-50 px-2 py-1 rounded-lg">
                                            <ShieldAlert size={14} />
                                            <span className="font-semibold">Pending</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Action Buttons (Outside Card - always visible) */}
            <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); handleActualDownload('download-pdf'); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-xl transition-colors"
                    title={kycStatus === true ? 'Download PDF' : 'Complete KYC to download'}
                >
                    {kycStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {kycStatus === true ? 'PDF' : kycStatus === 'loading' ? '...' : <span className="flex items-center gap-1"><Lock size={12} /> PDF</span>}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleActualDownload('download-img'); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-xl transition-colors"
                    title={kycStatus === true ? 'Download Image' : 'Complete KYC to download'}
                >
                    {kycStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
                    {kycStatus === true ? 'Image' : kycStatus === 'loading' ? '...' : <span className="flex items-center gap-1"><Lock size={12} /> Img</span>}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium rounded-xl transition-colors border border-teal-200"
                >
                    <RefreshCw size={14} /> Flip
                </button>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl transition-colors col-span-1 ${card.adminVerified ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}
                    disabled={!card.adminVerified}
                    title={card.adminVerified ? 'Wallet' : 'Wallet restricted until KYC is verified'}
                >
                    {card.adminVerified ? <Wallet size={14} /> : <Lock size={12} />} Wallet
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsEmailModalOpen(true); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors col-span-2"
                >
                    <Mail size={14} /> Email Card
                </button>
            </div>

            {/* 3D Transform CSS - Smooth 500ms animation */}
            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .transform-style-3d {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>

            <EmailECardModal
                isOpen={isEmailModalOpen}
                onClose={() => setIsEmailModalOpen(false)}
                cardName={card.name}
                card={card}
            />
        </div>
    );
}
