'use client';

import React, { useState, useCallback } from 'react';
import { X, Loader2, Shield, CreditCard, Lock, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardNumberElement,
    CardExpiryElement,
    CardCvcElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface AddMoneyModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onSuccess?: () => void;
}

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            fontSize: '15px',
            color: '#1e293b',
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSmoothing: 'antialiased',
            '::placeholder': { color: '#94a3b8' },
        },
        invalid: { color: '#ef4444', iconColor: '#ef4444' },
    },
};

// ─── Inner checkout form — lives inside <Elements> ────────────────────────────
function CheckoutForm({
    amount,
    clientSecret,
    paymentIntentId,
    onSuccess,
    onClose,
    onReset,
}: {
    amount: number;
    clientSecret: string;
    paymentIntentId: string;
    onSuccess?: () => void;
    onClose: () => void;
    onReset: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);
    const [cardError, setCardError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setIsProcessing(true);
        setCardError('');

        try {
            const cardNumberElement = elements.getElement(CardNumberElement);
            if (!cardNumberElement) throw new Error('Card element not found');

            // Confirm card payment with Stripe
            const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
                payment_method: { card: cardNumberElement },
            });

            if (stripeError) {
                setCardError(stripeError.message || 'Payment failed. Please try again.');
                setIsProcessing(false);
                return;
            }

            if (paymentIntent?.status !== 'succeeded') {
                setCardError('Payment was not completed. Please try again.');
                setIsProcessing(false);
                return;
            }

            // Server-side verification + wallet credit
            const confirmRes = await fetch('/api/wallet/stripe-confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentIntentId, amount }),
            });
            const confirmData = await confirmRes.json();

            if (!confirmData.success) {
                throw new Error(confirmData.error || 'Failed to credit wallet');
            }

            toast.success('Money added successfully! 🎉', {
                description: `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} has been credited to your wallet.`,
            });

            onSuccess?.();
            onClose();
        } catch (err: any) {
            console.error('Stripe payment error:', err);
            toast.error(err.message || 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-sm">
                <span className="text-emerald-700 font-medium">Charging amount</span>
                <span className="text-emerald-800 font-bold text-lg">
                    ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
            </div>

            {/* Card Number */}
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Card Number</label>
                <div className="relative">
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-400 transition-all">
                        <CardNumberElement options={CARD_ELEMENT_OPTIONS} />
                    </div>
                    <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Expiry</label>
                    <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-400 transition-all">
                        <CardExpiryElement options={CARD_ELEMENT_OPTIONS} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">CVC</label>
                    <div className="relative">
                        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-400 transition-all">
                            <CardCvcElement options={CARD_ELEMENT_OPTIONS} />
                        </div>
                        <Lock size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Card error */}
            {cardError && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{cardError}</span>
                </div>
            )}

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-5 text-xs text-slate-400 pt-1">
                <span className="flex items-center gap-1"><Shield size={11} className="text-emerald-500" /> Secured by Stripe</span>
                <span className="flex items-center gap-1"><Lock size={11} className="text-emerald-500" /> 256-bit SSL</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-1">
                <button
                    type="button"
                    onClick={onReset}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                    ← Change Amount
                </button>
                <button
                    type="submit"
                    disabled={!stripe || isProcessing}
                    className="flex-[2] py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-200/60 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? (
                        <><Loader2 size={16} className="animate-spin" /> Processing…</>
                    ) : (
                        <><Zap size={16} /> Pay & Add to Wallet</>
                    )}
                </button>
            </div>
        </form>
    );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────
export default function AddMoneyModal({ isOpen, onClose, currentBalance, onSuccess }: AddMoneyModalProps) {
    const [step, setStep] = useState<'amount' | 'card'>('amount');
    const [amount, setAmount] = useState<number>(0);
    const [customInput, setCustomInput] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [paymentIntentId, setPaymentIntentId] = useState('');
    const [isCreatingIntent, setIsCreatingIntent] = useState(false);

    const handleClose = () => {
        setStep('amount');
        setAmount(0);
        setCustomInput('');
        setClientSecret('');
        setPaymentIntentId('');
        onClose();
    };

    const handleReset = () => {
        setStep('amount');
        setClientSecret('');
        setPaymentIntentId('');
    };

    const handleQuickAmount = (val: number) => {
        setAmount(val);
        setCustomInput(String(val));
    };

    const handleCustomInput = (val: string) => {
        setCustomInput(val);
        const num = parseFloat(val);
        setAmount(!isNaN(num) && num > 0 ? num : 0);
    };

    const handleContinue = async () => {
        if (amount < 1) {
            toast.error('Minimum amount is $1');
            return;
        }

        setIsCreatingIntent(true);
        try {
            const res = await fetch('/api/wallet/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json();

            if (!data.success || !data.clientSecret) {
                throw new Error(data.error || 'Failed to initialize payment');
            }

            setClientSecret(data.clientSecret);
            setPaymentIntentId(data.paymentIntentId);
            setStep('card');
        } catch (err: any) {
            toast.error(err.message || 'Failed to initialize payment');
        } finally {
            setIsCreatingIntent(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-white text-lg">Add Money to Wallet</h3>
                        <p className="text-emerald-100 text-xs mt-0.5">
                            Current balance: <span className="font-semibold">${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'amount' ? (
                        <div className="space-y-5">
                            {/* Amount input */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Enter Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={customInput}
                                        onChange={(e) => handleCustomInput(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400 transition-all placeholder:font-normal placeholder:text-lg placeholder:text-slate-300"
                                        placeholder="0.00"
                                    />
                                </div>

                                {/* Quick amounts */}
                                <div className="grid grid-cols-3 gap-2">
                                    {QUICK_AMOUNTS.map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => handleQuickAmount(val)}
                                            className={`py-2 rounded-lg text-sm font-semibold border transition-all ${
                                                amount === val
                                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
                                            }`}
                                        >
                                            ${val}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Info notice */}
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                                <CheckCircle2 size={13} className="text-amber-500 shrink-0 mt-0.5" />
                                <span>Added money is for paying HealthMitra services. Only approved bill refunds are withdrawable to your bank.</span>
                            </div>

                            {/* Continue button */}
                            <button
                                onClick={handleContinue}
                                disabled={amount < 1 || isCreatingIntent}
                                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-base hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-200/60 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isCreatingIntent ? (
                                    <><Loader2 size={18} className="animate-spin" /> Preparing…</>
                                ) : (
                                    <>Continue to Payment →</>
                                )}
                            </button>
                        </div>
                    ) : (
                        clientSecret && (
                            <Elements stripe={stripePromise} options={{ clientSecret }}>
                                <CheckoutForm
                                    amount={amount}
                                    clientSecret={clientSecret}
                                    paymentIntentId={paymentIntentId}
                                    onSuccess={onSuccess}
                                    onClose={handleClose}
                                    onReset={handleReset}
                                />
                            </Elements>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
