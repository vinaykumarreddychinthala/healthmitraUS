'use client';

import React, { useState, useRef } from 'react';
import { ECardMember } from '@/types/ecard';
import {
    Download, Share2, Wallet, RefreshCw, Smartphone, Mail, Clock,
    Shield, Phone, Globe, ChevronRight, CheckCircle,
    ShieldAlert, Loader2, User, Lock
} from 'lucide-react';
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
                emergencyContact: card.emergencyContact || '9818823106',
                adminVerified: card.adminVerified ?? false,
                photoUrl: card.photoUrl,
                planFeatures: card.planFeatures,
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

    // Pending state
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
                        Complete KYC &amp; Activate Card
                    </button>
                </div>
            </div>
        );
    }

    const defaultBenefits = [
        'OPD Coverage – Unlimited as per Plan',
        'Unlimited Diagnostic Tests – 30% to 50% discount',
        'Medicine Home Delivery on 30% discount',
        'Free Annual Health Checkup (1 per member)',
        'Unlimited Telemedicine Consultations',
        'Emergency Ambulance Service',
    ];

    const benefits = (card.planFeatures && card.planFeatures.length > 0) ? card.planFeatures : defaultBenefits;

    return (
        <div className="w-full perspective-1000 group">
            {/* Flip Container */}
            <div
                className={`relative w-full transition-all duration-700 transform-style-3d cursor-pointer select-none ${isFlipped ? 'rotate-y-180' : ''}`}
                style={{ minHeight: '340px' }}
                onClick={() => setIsFlipped(!isFlipped)}
            >

                {/* ==================== FRONT SIDE ==================== */}
                <div className="w-full backface-hidden">
                    <div className="w-full bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 rounded-2xl shadow-2xl p-5 text-white flex flex-col relative overflow-hidden" style={{ minHeight: '330px' }}>

                        {/* Subtle Background Patterns */}
                        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/10 translate-y-1/3 -translate-x-1/4 pointer-events-none" />
                        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-cyan-400/10 pointer-events-none" />

                        {/* ── HEADER ROW ── */}
                        <div className="flex justify-between items-center z-10 shrink-0">
                            <div>
                                <p className="font-black text-base tracking-widest uppercase">HEALTHMITRA</p>
                                <p className="text-[10px] text-teal-200 mt-0.5 tracking-wide">Your Health, Our Priority</p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {card.adminVerified ? (
                                    <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-400 text-emerald-900 rounded-full flex items-center gap-1 shadow">
                                        <CheckCircle size={10} /> Active
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-bold px-2.5 py-1 bg-amber-400 text-amber-900 rounded-full flex items-center gap-1 shadow">
                                        <ShieldAlert size={10} /> Pending
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── MEMBER SECTION ── */}
                        <div className="flex gap-4 mt-4 z-10">
                            {/* Photo */}
                            <div className="w-[68px] h-[82px] rounded-xl flex-shrink-0 border-2 border-white/30 overflow-hidden bg-white/15 backdrop-blur-sm shadow-lg flex items-center justify-center">
                                {card.photoUrl ? (
                                    <img src={card.photoUrl} alt={card.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={28} className="text-white/50" />
                                )}
                            </div>

                            {/* Name + IDs */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-black text-lg uppercase tracking-wider leading-tight truncate">{card.name}</h4>
                                <p className="text-teal-200 text-[10px] mt-1">{card.relation}</p>
                                <div className="mt-2 space-y-1 text-[10px]">
                                    <div className="flex items-center gap-1">
                                        <span className="text-teal-300 w-[58px] shrink-0">Card No.:</span>
                                        <span className="font-mono font-bold text-amber-300">{card.cardUniqueId}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-teal-300 w-[58px] shrink-0">Member ID:</span>
                                        <span className="font-mono font-bold text-amber-300">{card.memberId || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── INFO GRID ── */}
                        <div className="mt-3 z-10 p-3 rounded-xl bg-white/10 border border-white/10 backdrop-blur-sm">
                            <div className="grid grid-cols-5 gap-x-2 gap-y-2 text-[10px]">
                                <div>
                                    <p className="text-teal-300 uppercase text-[9px]">DOB</p>
                                    <p className="font-semibold text-white mt-1">{card.dob || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-teal-300 uppercase text-[9px]">Age</p>
                                    <p className="font-semibold text-white mt-1">{card.age ? `${card.age} yrs` : 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-teal-300 uppercase text-[9px]">Gender</p>
                                    <p className="font-semibold text-white mt-1">{card.gender === 'M' ? 'Male' : card.gender === 'F' ? 'Female' : card.gender || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-teal-300 uppercase text-[9px]">Blood Grp</p>
                                    <p className="font-black text-base text-red-300 leading-tight mt-1">{card.bloodGroup || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-teal-300 uppercase text-[9px]">Relation</p>
                                    <p className="font-semibold text-white mt-1">{card.relation}</p>
                                </div>
                            </div>
                        </div>

                        {/* ── PLAN + VALIDITY + COVERAGE ── */}
                        <div className="mt-3 z-10 grid grid-cols-3 gap-3">
                            <div className="col-span-1">
                                <p className="text-teal-300 text-[9px] uppercase tracking-wide">Plan</p>
                                <p className="text-xs font-bold text-white leading-tight mt-0.5">{card.planName.toUpperCase()}</p>
                                <p className="text-teal-300 text-[9px] uppercase tracking-wide mt-2">Coverage</p>
                                <p className="text-xs font-bold text-white mt-0.5">No Limit</p>
                            </div>
                            <div className="col-span-2 bg-white/10 border border-white/10 rounded-xl p-2.5">
                                <p className="text-teal-300 text-[9px] uppercase tracking-wider font-semibold mb-2">Validity Period</p>
                                <div className="text-[10px] space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-teal-200 w-8">From</span>
                                        <span className="font-bold text-amber-300">{card.validFrom}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-teal-200 w-8">Till</span>
                                        <span className="font-bold text-amber-300">{card.validTill}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── FOOTER ── */}
                        <div className="mt-3 z-10">
                            <p className="text-[9px] text-white/40 italic">This card is digitally generated by HealthMitra</p>
                        </div>

                        {/* Tap hint */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 hidden sm:block pointer-events-none">
                            <p className="text-[9px] text-white/40 flex items-center gap-0.5 animate-pulse">Tap to see benefits <ChevronRight size={9} /></p>
                        </div>
                    </div>
                </div>

                {/* ==================== BACK SIDE ==================== */}
                <div className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180">
                    <div className="w-full h-full bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col relative overflow-hidden text-slate-800">

                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-slate-100 px-5 py-3 bg-gradient-to-r from-slate-50 to-teal-50 shrink-0">
                            <div>
                                <p className="font-bold text-sm text-slate-800 tracking-wide">HEALTHMITRA</p>
                                <p className="text-[9px] text-slate-400">Plan Benefits &amp; Contacts</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                className="text-[10px] font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 rounded-lg border border-teal-200 transition-colors"
                            >
                                ← Front
                            </button>
                        </div>

                        <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
                            {/* Left: Benefits */}
                            <div className="flex-1 flex flex-col min-h-0 p-4">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 shrink-0">KEY BENEFITS</p>
                                <div className="flex-1 overflow-y-auto min-h-0 pr-1 custom-scroll">
                                    <ul className="space-y-2">
                                        {benefits.map((benefit, idx) => (
                                            <li key={idx} className="flex gap-2 items-start text-xs text-slate-700">
                                                <span className="text-emerald-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                                                <span className="leading-snug">{benefit}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Right: Plan + Support */}
                            <div className="w-full sm:w-[220px] shrink-0 flex flex-col border-t sm:border-t-0 sm:border-l border-slate-100 p-4 bg-slate-50/50">
                                {/* Plan Info */}
                                <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-3 text-white mb-3">
                                    <p className="text-[9px] text-teal-100 uppercase tracking-wide mb-0.5">Active Plan</p>
                                    <p className="font-bold text-sm leading-tight">{card.planName}</p>
                                    <p className="text-[9px] text-teal-100 mt-1">Coverage: <span className="font-bold text-white">No Limit</span></p>
                                    <div className="mt-2 pt-2 border-t border-white/20 text-[9px] text-teal-100">
                                        <p>Valid: <span className="text-white font-semibold">{card.validFrom}</span></p>
                                        <p>Expires: <span className="text-white font-semibold">{card.validTill}</span></p>
                                    </div>
                                </div>

                                {/* Support Contacts */}
                                <div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">SUPPORT</p>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                                <Phone size={11} className="text-teal-600" />
                                            </div>
                                            <span className="text-slate-700 font-semibold">9818823106</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                                <Mail size={11} className="text-teal-600" />
                                            </div>
                                            <span className="text-slate-600 text-[10px] break-all">service@healthmitraus.com</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                                <Globe size={11} className="text-teal-600" />
                                            </div>
                                            <span className="text-slate-600 text-[10px]">www.healthmitraus.com</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Verified badge — only shown when admin has verified */}
                                {card.adminVerified && (
                                    <div className="mt-auto pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold">
                                            <Shield size={12} /> Verified by Admin
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── Action Buttons ── */}
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); handleActualDownload('download-pdf'); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    title="Download PDF (Front + Back)"
                >
                    {kycStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    PDF (Both Sides)
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); handleActualDownload('download-img'); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm"
                    title="Download Image (Front + Back)"
                >
                    {kycStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
                    Image (Both Sides)
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors border border-slate-200"
                >
                    <RefreshCw size={14} /> Flip Card
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsEmailModalOpen(true); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors border border-slate-200"
                >
                    <Mail size={14} /> Email Card
                </button>
            </div>

            {/* 3D Transform CSS */}
            <style jsx global>{`
                .perspective-1000 { perspective: 1200px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .rotate-y-180 { transform: rotateY(180deg); }
                .custom-scroll::-webkit-scrollbar { width: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
                .custom-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent; }
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
