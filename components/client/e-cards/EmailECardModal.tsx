'use client';

import React, { useState } from 'react';
import { X, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ECardMember } from '@/types/ecard';
import { buildCardEmailHTML } from '@/lib/cardDrawer';

interface EmailECardModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardName: string;
    card: ECardMember;
}

export default function EmailECardModal({ isOpen, onClose, cardName, card }: EmailECardModalProps) {
    const [email, setEmail] = useState('');
    const [altEmail, setAltEmail] = useState('');
    const [sendToAlt, setSendToAlt] = useState(false);
    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;

    const handleSend = async () => {
        const targets = [email.trim(), sendToAlt ? altEmail.trim() : ''].filter(Boolean);

        if (targets.length === 0) {
            toast.error('Please enter at least one email address.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = targets.filter(e => !emailRegex.test(e));
        if (invalidEmails.length > 0) {
            toast.error(`Invalid email: ${invalidEmails.join(', ')}`);
            return;
        }

        setIsSending(true);

        try {
            // Build a beautiful HTML card for the email
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

            const htmlContent = buildCardEmailHTML(cardData);

            // Send email via the existing /api/contact route or download route
            // We'll use the /api/download route to get the HTML, then trigger a mailto
            // For a real implementation, hit a dedicated /api/email-card endpoint
            const res = await fetch('/api/email-ecard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: targets,
                    cardName: card.name,
                    htmlContent,
                    memberId: card.memberId,
                }),
            });

            if (res.ok) {
                toast.success('E-Card sent successfully!', {
                    description: `Sent to: ${targets.join(', ')}`,
                });
                onClose();
            } else {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || 'Failed to send email.');
            }
        } catch (err: any) {
            // Fallback: open mailto with the email addresses
            console.warn('Email API failed, falling back to mailto:', err);
            const mailtoLink = `mailto:${targets.join(',')}?subject=${encodeURIComponent(`HealthMitra E-Card – ${card.name}`)}&body=${encodeURIComponent(`Please find attached your HealthMitra E-Card for ${card.name}.\n\nCard ID: ${card.cardUniqueId}\nPlan: ${card.planName}\nValid From: ${card.validFrom}\nValid Till: ${card.validTill}\n\nFor support, contact us at support@healthmitra.com`)}`;
            window.open(mailtoLink);
            toast.info('Opened your email client with card details.', {
                description: 'For automated sending, please configure the email API.',
            });
            onClose();
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-teal-50 to-slate-50">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center">
                            <Mail size={16} className="text-teal-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm">Email E-Card</h3>
                            <p className="text-xs text-slate-500">{cardName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <p className="text-sm text-slate-600">
                        We'll send a beautifully formatted HTML version of <strong>{cardName}</strong>'s E-Card to the email(s) below.
                    </p>

                    {/* Primary email */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Recipient Email *
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. john@example.com"
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Alternate email toggle */}
                    <div>
                        <label className="flex items-center gap-2.5 cursor-pointer group">
                            <div
                                onClick={() => setSendToAlt(!sendToAlt)}
                                className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${sendToAlt ? 'bg-teal-500' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sendToAlt ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-sm text-slate-700 group-hover:text-slate-800">Also send to alternate email</span>
                        </label>

                        {sendToAlt && (
                            <div className="mt-3 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Alternate Email
                                </label>
                                <input
                                    type="email"
                                    value={altEmail}
                                    onChange={(e) => setAltEmail(e.target.value)}
                                    placeholder="e.g. spouse@example.com"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Info box */}
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-xs text-teal-700">
                        <strong>📧 What will be sent:</strong> A fully formatted HTML e-card with member details, plan info, validity dates, and emergency contacts.
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending || !email.trim()}
                        className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-md shadow-teal-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <><Loader2 size={15} className="animate-spin" /> Sending...</>
                        ) : (
                            <><Mail size={15} /> Send E-Card</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
