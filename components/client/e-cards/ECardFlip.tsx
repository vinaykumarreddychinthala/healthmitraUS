'use client';

import React, { useState } from 'react';
import { ECardMember } from '@/types/ecard';
import { Download, Share2, Wallet, RefreshCw, Smartphone, Mail, Clock, Shield, Phone, Globe, ChevronRight, QrCode, CheckCircle, ShieldAlert, Loader2 } from 'lucide-react';
import EmailECardModal from './EmailECardModal';

interface ECardFlipProps {
    card: ECardMember;
    kycStatus?: boolean | 'loading';
    onDownloadClick?: (type: 'download-pdf' | 'download-img') => void;
}

export default function ECardFlip({ card, kycStatus, onDownloadClick }: ECardFlipProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

    // If card is pending, show pending state
    if (card.status === 'pending') {
        return (
            <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
                <div className="p-8 flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-3xl">
                        ⏳
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">CARD GENERATION PENDING</h3>
                        <p className="text-slate-500 mt-2 text-sm max-w-xs mx-auto">
                            Please complete ALL member details to generate your E-Card
                        </p>
                    </div>

                    <div className="w-full bg-slate-50 p-4 rounded-xl mt-4 border border-slate-100">
                        <div className="text-sm text-left space-y-1">
                            <p><span className="text-slate-500">Member:</span> <span className="font-semibold text-slate-700">{card.name} ({card.relation})</span></p>
                            <p><span className="text-slate-500">Plan:</span> <span className="font-semibold text-slate-700">{card.planName}</span></p>
                        </div>
                    </div>

                    <div className="w-full bg-amber-50 p-3 rounded-lg border border-amber-200 text-left">
                        <p className="text-xs text-amber-700 font-medium">⚠️ Required: Name, DOB, Gender, Blood Group, Mobile, Email, Aadhaar, PAN, Address, City, State, Pincode</p>
                    </div>
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
                style={{ minHeight: '420px' }}
                onClick={() => setIsFlipped(!isFlipped)}
            >

                {/* ==================== FRONT SIDE ==================== */}
                <div className="absolute w-full h-full backface-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-teal-500 via-teal-600 to-cyan-700 rounded-2xl shadow-2xl p-6 text-white flex flex-col justify-between relative overflow-hidden">

                        {/* Background Pattern */}
                        <div className="absolute top-0 right-0 w-72 h-72 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-56 h-56 bg-black opacity-10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl"></div>
                        <div className="absolute top-1/2 right-0 w-32 h-32 bg-cyan-400 opacity-10 rounded-full blur-2xl"></div>

                        {/* Header */}
                        <div className="flex justify-between items-start z-10">
                            <div>
                                <h3 className="font-bold text-xl tracking-wide">HEALTHMITRA</h3>
                                <p className="text-xs text-teal-100 opacity-90 mt-0.5">Your Health, Our Priority</p>
                            </div>
                            <span className="text-xs font-bold px-3 py-1.5 bg-green-400 text-green-900 rounded-full shadow-lg flex items-center gap-1">
                                <CheckCircle size={12} /> Active
                            </span>
                        </div>

                        {/* Member Details */}
                        <div className="flex gap-4 mt-5 z-10">
                            <div className="w-16 h-20 bg-white/20 rounded-xl flex-shrink-0 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
                                {card.photoUrl ? (
                                    <img src={card.photoUrl} alt={card.name} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <span className="text-3xl">👤</span>
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
                        <div className="mt-4 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 z-10">
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

                        {/* Plan & Coverage */}
                        <div className="mt-3 z-10">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] text-teal-200 uppercase tracking-wide">Plan</p>
                                    <p className="text-sm font-bold">{card.planName.toUpperCase()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-teal-200 uppercase tracking-wide">Coverage</p>
                                    <p className="text-sm font-bold">{formattedCoverage}</p>
                                </div>
                            </div>
                        </div>

                        {/* Validity Section */}
                        <div className="mt-3 p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 z-10">
                            <p className="text-[10px] text-teal-200 uppercase tracking-wider font-semibold mb-2">VALIDITY</p>
                            <div className="flex justify-between items-center text-xs">
                                <div>
                                    <span className="text-teal-100">Start:</span>{' '}
                                    <span className="font-bold text-white">{card.validFrom}</span>
                                </div>
                                <div className="text-teal-300">|</div>
                                <div>
                                    <span className="text-teal-100">End:</span>{' '}
                                    <span className="font-bold text-white">{card.validTill}</span>
                                    <span className="ml-1 text-[9px] text-teal-200">(1 Year)</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer - 24/7 Support & QR */}
                        <div className="mt-3 pt-3 border-t border-white/20 flex justify-between items-end z-10">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-yellow-400 text-yellow-900 px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                                    <Clock size={12} />
                                    24/7
                                </div>
                                <div className="text-xs">
                                    <p className="text-teal-200 text-[10px]">Support</p>
                                    <p className="font-bold">{card.emergencyContact || '1800-XXX-XXXX'}</p>
                                </div>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg shadow-lg">
                                <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded flex items-center justify-center">
                                    <QrCode size={24} className="text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Tap to Flip Indicator */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                            <p className="text-[10px] text-white/60 flex items-center gap-1 animate-pulse">
                                Tap to flip card <ChevronRight size={10} />
                            </p>
                        </div>
                    </div>
                </div>

                {/* ==================== BACK SIDE ==================== */}
                <div className="absolute w-full h-full backface-hidden rotate-y-180">
                    <div className="w-full h-full bg-white rounded-2xl shadow-2xl p-5 border border-slate-200 flex flex-col relative overflow-hidden text-slate-800">

                        {/* Header */}
                        <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 uppercase tracking-wide">Plan Basic Details</h3>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1 px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-200 transition-colors"
                            >
                                ← Flip Back
                            </button>
                        </div>

                        {/* Plan Name & Premium */}
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 p-4 rounded-xl border border-teal-100 mb-4">
                            <p className="font-bold text-teal-800 text-lg">{card.planName}</p>
                            <p className="text-sm text-teal-600 mt-1">Annual Premium: <span className="font-bold">${card.planPrice ? card.planPrice.toLocaleString('en-IN') : 'N/A'}</span></p>
                        </div>

                        {/* Key Benefits */}
                        <div className="flex-1 overflow-auto">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">KEY BENEFITS:</p>
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

                        {/* Emergency Contacts */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">EMERGENCY CONTACTS:</p>
                            <div className="space-y-1.5 text-sm text-slate-700">
                                <p className="flex items-center gap-2">
                                    <Phone size={14} className="text-teal-500" />
                                    <span>Helpline:</span>
                                    <span className="font-bold">{card.emergencyContact || '1800-XXX-XXXX'}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Mail size={14} className="text-teal-500" />
                                    <span>Email:</span>
                                    <span className="font-medium">support@healthmitra.com</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Globe size={14} className="text-teal-500" />
                                    <span>Website:</span>
                                    <span className="font-medium">www.healthmitra.com</span>
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                            <div className="space-y-0.5">
                                <p>Policy No: <span className="text-slate-700 font-medium">{card.policyNo}</span></p>
                                <p>Issued By: <span className="text-slate-700 font-medium">HealthMitra Insurance Services</span></p>
                            </div>
                            <div className="flex items-center gap-1 text-teal-600 bg-teal-50 px-2 py-1 rounded-lg">
                                <Shield size={14} />
                                <span className="font-semibold">Verified</span>
                            </div>
                        </div>

                        {/* Tap to Flip Back Indicator */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 animate-pulse">
                                ← Tap to flip back
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Action Buttons (Outside Card - always visible) */}
            <div className="mt-4 grid grid-cols-3 gap-2">
                <button
                    onClick={(e) => { e.stopPropagation(); onDownloadClick?.('download-pdf'); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-xl transition-colors"
                    title={kycStatus === true ? 'Download PDF' : 'Complete KYC to download'}
                >
                    {kycStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {kycStatus === true ? 'PDF' : kycStatus === 'loading' ? '...' : '🔒 PDF'}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDownloadClick?.('download-img'); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-xl transition-colors"
                    title={kycStatus === true ? 'Download Image' : 'Complete KYC to download'}
                >
                    {kycStatus === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
                    {kycStatus === true ? 'Image' : kycStatus === 'loading' ? '...' : '🔒 Img'}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-medium rounded-xl transition-colors border border-teal-200"
                >
                    <RefreshCw size={14} /> Flip
                </button>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors col-span-1"
                >
                    <Wallet size={14} /> Wallet
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
            />
        </div>
    );
}
