
'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Turnstile } from '@/components/ui/turnstile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    CheckCircle, CreditCard, Shield, Loader2, ArrowLeft, AlertCircle,
    Star, Lock, Zap, User, Mail, Phone, Tag, ChevronDown, ChevronUp,
    Globe, MapPin,
} from 'lucide-react';
import { loadRazorpay } from '@/lib/razorpay';
import { toast } from 'sonner';
import { validatePromoCode } from '@/app/actions/coupons';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/client/StripePaymentForm';
import { parseDescriptionPoints } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface Plan {
    id: string; name: string; description: string; price: number;
    duration_days: number; allowed_services: string[];
    is_active: boolean; is_featured: boolean; coverage_amount?: number;
}
interface GuestInfo { name: string; email: string; phone: string; planId: string; verified: boolean; }

// Feature detail descriptions for dropdown tooltips
const FEATURE_DETAILS: Record<string, { label: string; detail: string }> = {
    ambulance: {
        label: 'Ambulance',
        detail: '24/7 emergency ambulance dispatch. Includes air and ground ambulance coverage with priority response for cardiac, trauma, and critical emergencies. No co-pay for network ambulances.',
    },
    medical_consultation: {
        label: 'Doctor Consultation – 50% Discount',
        detail: 'Get 50% off on all doctor consultations including specialist visits, follow-ups, and tele-consultations. Valid at 2,000+ empanelled doctors and clinics. Discount applies automatically at point of service. Includes unlimited text-based follow-up for 48 hours post consultation.',
    },
    diagnostic: {
        label: 'Lab Tests / Diagnostic',
        detail: 'Discounted lab tests at 500+ partner diagnostic centres. Covers blood panels, imaging (X-ray, MRI, CT scan), pathology, and preventive health check-ups. Home sample collection available in select cities.',
    },
    caretaker: {
        label: 'Caretaker Service',
        detail: 'Trained and verified caretakers available for post-surgery recovery, elderly care, or chronic illness management. Provided by certified caregiving professionals. Available for 4–12 hour shifts.',
    },
    nursing: {
        label: 'Nursing at Home',
        detail: 'Qualified registered nurses for at-home medication administration, wound dressing, IV therapy, and daily vitals monitoring. Ideal for post-hospitalisation care.',
    },
};

type CountryMode = 'us' | 'india';

export default function CheckoutPage({ params }: { params: Promise<{ plan: string }> }) {
    const { plan: planId } = use(params);
    const router = useRouter();
    const paypalRef = useRef<HTMLDivElement>(null);
    const paypalRendered = useRef(false);

    const [plan, setPlan] = useState<Plan | null>(null);
    const [guestInfo, setGuestInfo] = useState<GuestInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [razorpaySettings, setRazorpaySettings] = useState({ enabled: false, keyId: '' });
    const [paypalSettings, setPaypalSettings] = useState({ enabled: false, clientId: '', sandbox: false });
    const [stripeSettings, setStripeSettings] = useState({ enabled: false, publishableKey: '', clientSecret: '' });
    const [promoCode, setPromoCode] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [referralSaved, setReferralSaved] = useState(false);
    const [appliedCode, setAppliedCode] = useState<{ code: string; discount: number; type: string } | null>(null);
    const [validatingCode, setValidatingCode] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState<{
        email: string; name: string; phone: string;
        planName: string; transactionId: string; amount: number;
        basePrice: number; discountAmt: number; taxAmount: number;
        paymentDate: string; receiptCurrency: string;
    } | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
    const [countryMode, setCountryMode] = useState<CountryMode>('us');
    const [exchangeRate, setExchangeRate] = useState<number>(84); // default fallback USD→INR
    const [rateLoading, setRateLoading] = useState(false);

    // Fetch live USD→INR exchange rate
    useEffect(() => {
        setRateLoading(true);
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(r => r.json())
            .then(data => {
                if (data?.rates?.INR) setExchangeRate(data.rates.INR);
            })
            .catch(() => { /* silently use fallback rate */ })
            .finally(() => setRateLoading(false));
    }, []);

    const [otpStep, setOtpStep] = useState(1);
    const [newEmailOtp, setNewEmailOtp] = useState('');
    const [newEmailHash, setNewEmailHash] = useState('');
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const [isPlanDetailsOpen, setIsPlanDetailsOpen] = useState(false);

    useEffect(() => {
        const checkAuthAndLoad = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            let info: GuestInfo | null = null;

            if (user) {
                // If logged in, fetch profile and construct GuestInfo dynamically
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                info = {
                    name: profile?.full_name || '',
                    email: user.email || '',
                    phone: profile?.phone || '',
                    planId: planId,
                    verified: true,
                };
            } else {
                // If guest, check sessionStorage
                const stored = sessionStorage.getItem('checkout_user');
                if (!stored) {
                    toast.error('Please verify your email first.');
                    router.push(`/checkout-auth/${planId}`);
                    return;
                }
                const parsed: GuestInfo = JSON.parse(stored);
                if (!parsed.verified || parsed.planId !== planId) {
                    toast.error('Session mismatch. Please start again.');
                    router.push(`/checkout-auth/${planId}`);
                    return;
                }
                info = parsed;
            }

            if (!info) return;

            setGuestInfo(info);
            setEditName(info.name);
            setEditEmail(info.email);
            setEditPhone(info.phone);

            // Fetch settings and plan details
            const [settingsRes, paypalRes, stripeRes, planRes] = await Promise.all([
                fetch('/api/settings/razorpay'), fetch('/api/settings/paypal'),
                fetch('/api/settings/stripe'), fetch(`/api/plans/${planId}`),
            ]);
            const [s, pp, stripe, p] = await Promise.all([
                settingsRes.json(), paypalRes.json(), stripeRes.json(), planRes.json(),
            ]);
            if (s.success) setRazorpaySettings(s.data);
            if (pp.success) setPaypalSettings(pp.data);
            if (stripe.success && stripe.data?.enabled) {
                const intentRes = await fetch('/api/stripe/create-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ planId, amount: p.data?.price, guestEmail: info.email }),
                });
                const intentData = await intentRes.json();
                setStripeSettings({ enabled: true, publishableKey: stripe.data.publishableKey, clientSecret: intentData.clientSecret });
            }
            if (p.success) setPlan(p.data);
            else { toast.error('Plan not found'); router.push('/plans'); }
            setLoading(false);
        };
        checkAuthAndLoad();
    }, [planId, router]);

    const onPurchaseSuccess = (result: { success: boolean; data?: { planName?: string; amount?: number; transactionId?: string } }) => {
        sessionStorage.removeItem('checkout_user');
        const d = result?.data || {};
        const indiaMode = countryMode === 'india';
        const receiptCurrency = indiaMode ? '₹' : '$';

        const usdBase = plan?.price || 0;
        const usdDisc = appliedCode?.discount || 0;

        // Convert to display currency
        const base = indiaMode ? Math.round(usdBase * exchangeRate) : usdBase;
        const disc = indiaMode ? Math.round(usdDisc * exchangeRate) : usdDisc;
        const baseNet = Math.max(0, base - disc);
        const tax = indiaMode ? Math.round(baseNet * 0.18) : 0;
        const computedTotal = baseNet + tax;

        setPurchaseSuccess({
            email: editEmail,
            name: editName,
            phone: editPhone,
            planName: d.planName || plan?.name || '',
            transactionId: d.transactionId || '',
            amount: computedTotal,
            basePrice: base,
            discountAmt: disc,
            taxAmount: tax,
            paymentDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
            receiptCurrency,
        });
    };


    const callGuestPurchase = async (paymentMethod: string, transactionId?: string) => {
        if (!plan || !guestInfo) return null;
        const res = await fetch('/api/checkout/create-guest-purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: editName, email: editEmail, phone: editPhone,
                planId: plan.id, paymentMethod,
                transactionId: transactionId || `TEST_${Date.now()}`,
                promoCode: appliedCode?.code,
                referralCode: referralCode.trim() || undefined,
                amount: total,
                currency: isIndia ? 'INR' : 'USD'
            }),
        });
        return res.json();
    };

    // PayPal
    useEffect(() => {
        if (!plan || !paypalSettings.enabled || !paypalSettings.clientId || paypalRendered.current || !paypalRef.current) return;
        paypalRendered.current = true;
        const scriptId = 'paypal-sdk';
        document.getElementById(scriptId)?.remove();
        const sdkBase = paypalSettings.sandbox ? 'https://www.sandbox.paypal.com' : 'https://www.paypal.com';
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `${sdkBase}/sdk/js?client-id=${paypalSettings.clientId}&currency=USD&components=buttons`;
        script.async = true;
        script.onload = () => {
            if (!paypalRef.current || !(window as Window & { paypal?: { Buttons: (opts: unknown) => { render: (el: HTMLElement) => void } } }).paypal) return;
            (window as Window & { paypal?: { Buttons: (opts: unknown) => { render: (el: HTMLElement) => void } } }).paypal!.Buttons({
                style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay', height: 45 },
                createOrder: async () => {
                    const res = await fetch('/api/paypal/create-order', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ planId: plan.id, amount: total, promoCode: appliedCode?.code }),
                    });
                    const d = await res.json();
                    if (!d.success) throw new Error(d.error);
                    return d.data.orderId;
                },
                onApprove: async (data: { orderID: string }) => {
                    setProcessing(true);
                    try {
                        const captureRes = await fetch('/api/paypal/capture-order', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paypalOrderId: data.orderID, planId: plan.id, promoCode: appliedCode?.code }),
                        });
                        const captureData = await captureRes.json();
                        if (!captureData.success) { toast.error(captureData.error || 'PayPal capture failed'); return; }
                        const txId = captureData.data?.transactionId;
                        const result = await callGuestPurchase('paypal', txId);
                        if (result?.success) onPurchaseSuccess(result);
                        else toast.error(result?.error || 'Purchase recording failed');
                    } finally { setProcessing(false); }
                },
                onError: () => toast.error('PayPal payment failed'),
                onCancel: () => toast.info('Payment cancelled'),
            }).render(paypalRef.current!);
        };
        document.body.appendChild(script);
    }, [plan, paypalSettings]);

    const handleTestPayment = async () => {
        setProcessing(true);
        const result = await callGuestPurchase('test');
        setProcessing(false);
        if (result?.success) onPurchaseSuccess(result);
        else toast.error(result?.error || 'Purchase failed');
    };

    const handleSendNewEmailOTP = async () => {
        if (!editName || !editEmail || !editPhone) {
            toast.error('Please fill in all fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editEmail)) {
            toast.error('please enter valid mail id');
            return;
        }
        setProcessing(true);
        try {
            const res = await fetch('/api/auth/send-custom-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, turnstileToken })
            });
            const data = await res.json();
            if (data.success) {
                setNewEmailHash(data.hash);
                setOtpStep(2);
                toast.success(`OTP sent to ${editEmail}`);
            } else {
                toast.error(data.error || 'Failed to send OTP');
            }
        } catch {
            toast.error('Failed to send OTP');
        } finally {
            setProcessing(false);
        }
    };

    const handleVerifyNewEmailOTP = async () => {
        if (!newEmailOtp || newEmailOtp.length < 6) return;
        setProcessing(true);
        try {
            const res = await fetch('/api/auth/verify-custom-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: editEmail, otp: newEmailOtp, hash: newEmailHash,
                    name: editName, phone: editPhone, planId: plan?.id,
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Email verified successfully!');
                const updatedInfo = { ...guestInfo!, email: editEmail, name: editName, phone: editPhone, verified: true };
                setGuestInfo(updatedInfo);
                sessionStorage.setItem('checkout_user', JSON.stringify(updatedInfo));
                setOtpStep(1);
                setNewEmailOtp('');
                setTurnstileToken('');
            } else {
                toast.error(data.error || 'Invalid OTP');
            }
        } catch {
            toast.error('Verification failed');
        } finally {
            setProcessing(false);
        }
    };

    const handleRazorpay = async () => {
        if (!plan || !guestInfo) return;
        setProcessing(true);
        try {
            const orderRes = await fetch('/api/checkout/order', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: plan.id, amount: total, promoCode: appliedCode?.code }),
            });
            const orderData = await orderRes.json();
            if (!orderData.success) { toast.error(orderData.error || 'Failed to create order'); setProcessing(false); return; }
            const rzp = await loadRazorpay(orderData.data.keyId);
            rzp.open({
                key: orderData.data.keyId, amount: orderData.data.amount,
                currency: orderData.data.currency, name: 'HealthMitra',
                description: plan.name, order_id: orderData.data.orderId,
                handler: async (response: { razorpay_payment_id: string }) => {
                    const result = await callGuestPurchase('razorpay', response.razorpay_payment_id);
                    if (result?.success) onPurchaseSuccess(result);
                    else toast.error(result?.error || 'Purchase failed');
                },
                prefill: { name: guestInfo.name, email: guestInfo.email, contact: guestInfo.phone },
                theme: { color: '#0891b2' },
            });
        } finally { setProcessing(false); }
    };

    const handleStripeSuccess = async (paymentId: string) => {
        setProcessing(true);
        const result = await callGuestPurchase('stripe', paymentId);
        setProcessing(false);
        if (result?.success) onPurchaseSuccess(result);
        else toast.error(result?.error || 'Purchase failed');
    };

    const handleApplyPromo = async () => {
        if (!plan || !promoCode.trim()) return;
        setValidatingCode(true);
        const res = await validatePromoCode(promoCode.trim(), plan.price);
        setValidatingCode(false);
        if (res.success && res.data) { setAppliedCode(res.data); toast.success('Promo code applied!'); }
        else toast.error(res.message || 'Invalid promo code');
    };

    const handleSaveReferral = () => {
        if (referralCode.trim()) {
            setReferralSaved(true);
            toast.success('Referral code saved!');
        }
    };

    if (loading) return (
        <><Header /><div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div><Footer /></>
    );
    if (!plan) return null;

    const discount = appliedCode?.discount || 0;

    // Country-mode pricing with live currency conversion
    const isIndia = countryMode === 'india';
    // Convert base plan price (USD) → INR if India, else keep in USD
    const basePriceInCurrency = isIndia ? Math.round(plan.price * exchangeRate) : plan.price;
    const discountInCurrency = isIndia ? Math.round(discount * exchangeRate) : discount;
    const coverageAmountInCurrency = isIndia && plan.coverage_amount ? Math.round(Number(plan.coverage_amount) * exchangeRate) : plan.coverage_amount;
    const baseAfterDiscount = Math.max(0, basePriceInCurrency - discountInCurrency);
    const gstAmount = isIndia ? Math.round(baseAfterDiscount * 0.18) : 0;
    const total = baseAfterDiscount + gstAmount;
    const currency = isIndia ? '₹' : '$';

    // Payment availability per country
    const indiaPaymentAvailable = razorpaySettings.enabled;
    const usPaymentAvailable = paypalSettings.enabled || stripeSettings.enabled;
    const anyLivePayment = isIndia ? indiaPaymentAvailable : usPaymentAvailable;

    const stripePromise = stripeSettings.publishableKey ? loadStripe(stripeSettings.publishableKey) : null;
    const isEmailChanged = guestInfo && editEmail !== guestInfo.email;

    const toggleFeature = (serviceId: string) => {
        setExpandedFeature(prev => prev === serviceId ? null : serviceId);
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">

                    {/* ── SUCCESS SCREEN ──────────────────────────────────────── */}
                    {purchaseSuccess ? (
                        <div className="max-w-2xl mx-auto py-8 animate-in fade-in-50">
                            {/* Confetti header */}
                            <div className="text-center mb-8">
                                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                                </div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-1">Payment Successful! 🎉</h2>
                                <p className="text-slate-500">Thank you for choosing HealthMitra</p>
                            </div>

                            {/* Receipt card */}
                            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                                {/* Receipt header */}
                                <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-8 py-6 text-white">
                                    <p className="text-teal-100 text-sm font-medium uppercase tracking-wider mb-1">Payment Receipt</p>
                                    <h3 className="text-xl font-bold">Hey, {purchaseSuccess.name}.</h3>
                                    <p className="text-teal-100 text-sm mt-1">Thank you for Purchasing your Preventive Health Plan from us — we&apos;re glad you did.</p>
                                    <p className="text-teal-100 text-sm mt-1">An Email has been sent to your registered Email ID with your User ID and Password. Kindly update the same.</p>
                                </div>

                                {/* Payment No + Date */}
                                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                                    <div className="px-6 py-4">
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Payment No.</p>
                                        <p className="font-mono font-semibold text-slate-800 text-sm break-all">{purchaseSuccess.transactionId}</p>
                                    </div>
                                    <div className="px-6 py-4">
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Payment Date</p>
                                        <p className="font-semibold text-slate-800 text-sm">{purchaseSuccess.paymentDate}</p>
                                    </div>
                                </div>

                                {/* Client + Payment To */}
                                <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100">
                                    <div className="px-6 py-4">
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Client</p>
                                        <p className="font-semibold text-slate-800">{purchaseSuccess.name}</p>
                                        <p className="text-sm text-slate-500 mt-0.5">{purchaseSuccess.phone}</p>
                                        <p className="text-sm text-slate-500 break-all">{purchaseSuccess.email}</p>
                                    </div>
                                    <div className="px-6 py-4">
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">Payment To</p>
                                        <p className="font-semibold text-slate-800">HealthMitra Systems Pvt Ltd</p>
                                        <p className="text-sm text-slate-500 mt-0.5">+91 9818823106</p>
                                        <p className="text-sm text-slate-500">service@healthmitraus.com</p>
                                    </div>
                                </div>

                                {/* Description table */}
                                <div className="px-6 py-4">
                                    <div className="flex justify-between py-2 border-b border-slate-100">
                                        <p className="text-sm font-semibold text-slate-600">Description</p>
                                        <p className="text-sm font-semibold text-slate-600">Amount</p>
                                    </div>
                                    <div className="flex justify-between py-3 border-b border-slate-100">
                                        <p className="text-sm text-slate-700">{purchaseSuccess.planName}</p>
                                        <p className="text-sm font-medium text-slate-800">{purchaseSuccess.receiptCurrency}{Number(purchaseSuccess.amount).toLocaleString()}</p>
                                    </div>
                                    <div className="space-y-2 py-3 border-b border-slate-100">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Basic Price</span>
                                            <span className="text-slate-700">{purchaseSuccess.receiptCurrency}{Number(purchaseSuccess.basePrice).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Discount</span>
                                            <span className="text-emerald-600">-{purchaseSuccess.receiptCurrency}{Number(purchaseSuccess.discountAmt).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Tax</span>
                                            <span className="text-slate-700">{purchaseSuccess.receiptCurrency}{Number(purchaseSuccess.taxAmount).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pt-3">
                                        <span className="font-bold text-slate-900 text-base">Total:</span>
                                        <span className="font-bold text-teal-600 text-xl">{purchaseSuccess.receiptCurrency}{Number(purchaseSuccess.amount).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Email notice */}
                                <div className="mx-6 mb-6 p-4 bg-teal-50 border border-teal-100 rounded-xl">
                                    <p className="text-sm text-teal-700">📧 Login credentials have been sent to <strong className="font-semibold">{purchaseSuccess.email}</strong>. Check your inbox for your User ID &amp; Password.</p>
                                </div>

                                {/* Actions */}
                                <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => router.push('/login')}
                                        className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-all"
                                    >
                                        Login to Customer Portal
                                    </button>
                                    <button
                                        onClick={() => router.push('/')}
                                        className="flex-1 flex items-center justify-center gap-2 border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium px-6 py-3 rounded-xl transition-all"
                                    >
                                        Back to Home
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                    <>
                    <button onClick={() => router.push('/plans')} className="flex items-center gap-2 text-slate-500 hover:text-primary mb-6 text-sm font-medium">
                        <ArrowLeft className="w-4 h-4" /> Back to Plans
                    </button>
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900">Secure Checkout</h1>
                        <p className="text-slate-500 mt-1">Review your plan and complete payment</p>
                    </div>

                    {/* ── COUNTRY SELECTOR ──────────────────────────────────── */}
                    <div className="mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <p className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" /> Select your country for pricing &amp; payment
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCountryMode('us')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    countryMode === 'us'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                <span className="text-lg">🇺🇸</span> United States (USD $)
                            </button>
                            <button
                                onClick={() => setCountryMode('india')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                                    countryMode === 'india'
                                        ? 'border-primary bg-primary/5 text-primary'
                                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                <span className="text-lg">🇮🇳</span> India (INR ₹ + GST)
                            </button>
                        </div>
                        {countryMode === 'india' && (
                            <div className="mt-2 space-y-1">
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 shrink-0" /> 18% GST will be applied as per Indian tax regulations.
                                </p>
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                    {rateLoading ? '⏳ Fetching live rate...' : `💱 1 USD = ₹${exchangeRate.toFixed(2)} (live rate)`}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid lg:grid-cols-5 gap-8">
                        {/* LEFT: Plan Details */}
                        <div className="lg:col-span-3 space-y-4">

                            {/* Plan Card — aligned */}
                            <Card className="border border-slate-200 shadow-sm overflow-hidden">
                                <div className="h-1.5 bg-gradient-to-r from-primary to-cyan-400" />
                                <CardHeader className="pb-3 pt-5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg text-slate-800">Your Selected Plan</CardTitle>
                                        {plan.is_featured && <Badge className="bg-amber-100 text-amber-700"><Star className="w-3 h-3 mr-1 fill-amber-500" />Popular</Badge>}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        {/* Plan name + price row */}
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                                    <Shield className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg leading-tight">{plan.name}</h3>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-xs border-primary/30 text-primary">{plan.duration_days} days</Badge>
                                                        {!!plan.coverage_amount && Number(plan.coverage_amount) > 0 && <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50">{currency}{Number(coverageAmountInCurrency).toLocaleString()} cover</Badge>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-2xl font-bold text-slate-900">{currency}{Number(basePriceInCurrency).toLocaleString()}</p>
                                                <p className="text-xs text-slate-400">Base Price</p>
                                            </div>
                                        </div>
                                        {/* Description points Dropdown Toggle */}
                                        <button 
                                            onClick={() => setIsPlanDetailsOpen(!isPlanDetailsOpen)}
                                            className="mt-3 flex items-center justify-between w-full text-sm font-semibold text-slate-700 hover:text-primary transition-colors"
                                        >
                                            <span>View Plan Details</span>
                                            <svg className={`w-4 h-4 transition-transform ${isPlanDetailsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Collapsible Description points */}
                                        {isPlanDetailsOpen && (
                                            <div className="text-slate-500 text-sm space-y-1 pl-1 mt-3 border-t border-primary/10 pt-3">
                                                {parseDescriptionPoints(plan.description).map((point, idx) => (
                                                    <div key={idx} className="flex items-start gap-1.5">
                                                        <span className="text-primary select-none mt-1 shrink-0">•</span>
                                                        <span>{point}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Included Services — with expandable dropdowns */}
                            {(plan.allowed_services || []).length > 0 && (
                                <Card className="border border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base text-slate-800">Plan Features</CardTitle>
                                        <p className="text-xs text-slate-400 mt-0.5">Click any feature to learn more</p>
                                    </CardHeader>
                                    <CardContent className="pt-0 space-y-2">
                                        {plan.allowed_services.map((s) => {
                                            const feature = FEATURE_DETAILS[s];
                                            const label = feature?.label || s;
                                            const detail = feature?.detail;
                                            const isOpen = expandedFeature === s;
                                            return (
                                                <div key={s} className="rounded-lg border border-slate-100 overflow-hidden">
                                                    <button
                                                        onClick={() => detail ? toggleFeature(s) : undefined}
                                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${detail ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'} ${isOpen ? 'bg-primary/5' : 'bg-white'}`}
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                        </div>
                                                        <span className="flex-1 text-sm font-medium text-slate-700">{label}</span>
                                                        {detail && (
                                                            isOpen
                                                                ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                                                : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                                        )}
                                                    </button>
                                                    {isOpen && detail && (
                                                        <div className="px-4 py-3 bg-primary/5 border-t border-primary/10 text-sm text-slate-600 leading-relaxed">
                                                            {detail}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Price Breakdown */}
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader className="pb-3"><CardTitle className="text-base text-slate-800">Price Breakdown</CardTitle></CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Base Price</span>
                                        <span className="text-slate-800 font-medium">{currency}{Number(basePriceInCurrency).toLocaleString()}</span>
                                    </div>
                                    {appliedCode && (
                                        <div className="flex justify-between text-sm text-emerald-600 font-medium">
                                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Discount ({appliedCode.code})</span>
                                            <span>-{currency}{Number(discountInCurrency).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {isIndia && (
                                        <div className="flex justify-between text-sm text-slate-500">
                                            <span>GST (18%)</span>
                                            <span>+{currency}{gstAmount.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="h-px bg-slate-100" />
                                    <div className="flex justify-between text-base font-bold">
                                        <span className="text-slate-900">Total Payable</span>
                                        <span className="text-primary text-lg">{currency}{total.toLocaleString()}</span>
                                    </div>
                                    {!isIndia && <p className="text-xs text-slate-400">* Taxes (if any) determined at checkout by payment processor</p>}
                                </CardContent>
                            </Card>

                            {/* Coupon Code — vertical */}
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader className="pb-2 pt-4">
                                    <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-primary" /> Coupon Code
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    {!appliedCode ? (
                                        <div className="flex flex-col gap-2">
                                            <Input
                                                placeholder="Enter coupon code"
                                                value={promoCode}
                                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                                disabled={validatingCode}
                                                className="h-10"
                                            />
                                            <Button
                                                onClick={handleApplyPromo}
                                                disabled={validatingCode || !promoCode.trim()}
                                                variant="outline"
                                                className="w-full border-primary text-primary hover:bg-primary/5"
                                            >
                                                {validatingCode ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Apply Coupon
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                            <span className="text-sm font-bold text-emerald-700">{appliedCode.code} applied ✓</span>
                                            <Button variant="ghost" size="sm" onClick={() => { setAppliedCode(null); setPromoCode(''); }} className="text-slate-400 hover:text-rose-500">Remove</Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Referral Code — vertical */}
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader className="pb-2 pt-4">
                                    <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary" /> Referral Code
                                        <span className="text-xs font-normal text-slate-400">(optional)</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-2">
                                    {referralSaved ? (
                                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                            <span className="text-sm font-bold text-blue-700">{referralCode} saved ✓</span>
                                            <Button variant="ghost" size="sm" onClick={() => { setReferralSaved(false); setReferralCode(''); }} className="text-slate-400 hover:text-rose-500">Remove</Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <Input
                                                placeholder="Enter referral code"
                                                value={referralCode}
                                                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                                                className="h-10"
                                            />
                                            <Button
                                                variant="outline"
                                                className="w-full border-slate-300 text-slate-600 hover:border-primary hover:text-primary"
                                                onClick={handleSaveReferral}
                                                disabled={!referralCode.trim()}
                                            >
                                                Apply Referral Code
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT: Editable User Info + Payment */}
                        <div className="lg:col-span-2">
                            <div className="sticky top-8 space-y-4">
                                {/* Editable Customer Info */}
                                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                                    <CardHeader className="pb-3 pt-4">
                                        <CardTitle className="text-base text-slate-800">Your Details</CardTitle>
                                        <p className="text-xs text-slate-400 mt-0.5">Pre-filled — edit if needed</p>
                                    </CardHeader>
                                    <CardContent className="pt-0 space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><User className="w-3 h-3" /> Full Name</label>
                                            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name" className="h-9 text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</label>
                                            <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="Email address" type="email" className="h-9 text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</label>
                                            <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Phone number" type="tel" className="h-9 text-sm" />
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Payment Card */}
                                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="h-1.5 bg-gradient-to-r from-primary to-cyan-400" />
                                    <CardHeader className="pb-3 pt-5">
                                        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-primary" /> Payment
                                        </CardTitle>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {isIndia ? '🇮🇳 Paying in INR via Razorpay' : '🇺🇸 Paying in USD via PayPal / Stripe'}
                                        </p>
                                    </CardHeader>
                                    <CardContent className="pt-0 space-y-4">
                                        {isEmailChanged ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                                                    <AlertCircle className="w-5 h-5 mb-2 text-amber-600" />
                                                    You changed your email from <strong className="font-semibold">{guestInfo!.email}</strong> to <strong className="font-semibold">{editEmail}</strong>.
                                                    Please verify this new email to proceed.
                                                </div>
                                                {otpStep === 2 ? (
                                                    <div className="space-y-3">
                                                        <Input
                                                            value={newEmailOtp}
                                                            onChange={e => setNewEmailOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                                            placeholder="Enter 6-digit OTP"
                                                            className="text-center tracking-widest text-lg font-bold h-12"
                                                            maxLength={6}
                                                        />
                                                        <div className="flex gap-2">
                                                            <Button variant="outline" onClick={() => setOtpStep(1)} disabled={processing} className="flex-1">Back</Button>
                                                            <Button onClick={handleVerifyNewEmailOTP} disabled={processing || newEmailOtp.length < 6} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                                                                {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Verify OTP'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Turnstile onVerify={(token) => setTurnstileToken(token)} />
                                                        <Button onClick={handleSendNewEmailOTP} disabled={processing || !turnstileToken} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11">
                                                            {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Verify New Email'}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                {!anyLivePayment && (
                                                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium bg-amber-50 border border-amber-200 text-amber-700">
                                                        <AlertCircle className="w-4 h-4 shrink-0" /> Test Payment Mode
                                                    </div>
                                                )}
                                                <div className="text-center py-3 border border-slate-100 rounded-xl bg-slate-50">
                                                    <p className="text-3xl font-bold text-slate-900">{currency}{total.toLocaleString()}</p>
                                                    <p className="text-xs text-slate-400 mt-1">total amount{isIndia ? ' (incl. GST)' : ''}</p>
                                                </div>

                                                {/* India: Razorpay only */}
                                                {isIndia && razorpaySettings.enabled && (
                                                    <Button onClick={handleRazorpay} disabled={processing} className="w-full h-12 text-sm font-semibold bg-[#072654] hover:bg-[#061e42] text-white gap-2">
                                                        {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4" /> Pay with Razorpay</>}
                                                    </Button>
                                                )}
                                                {isIndia && !razorpaySettings.enabled && (
                                                    <p className="text-xs text-center text-slate-400">Razorpay is not configured for India payments.</p>
                                                )}

                                                {/* US: PayPal + Stripe */}
                                                {!isIndia && paypalSettings.enabled && (
                                                    <div>
                                                        {processing && <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Completing payment...</div>}
                                                        <div ref={paypalRef} id="paypal-button-container" className={processing ? 'opacity-40 pointer-events-none' : ''} />
                                                    </div>
                                                )}
                                                {!isIndia && stripeSettings.enabled && stripeSettings.clientSecret && stripePromise && (
                                                    <Elements stripe={stripePromise} options={{ clientSecret: stripeSettings.clientSecret }}>
                                                        <StripePaymentForm total={total} planId={plan.id} promoCode={appliedCode?.code} onSuccess={handleStripeSuccess} />
                                                    </Elements>
                                                )}

                                                {/* Test Payment */}
                                                {!anyLivePayment && (
                                                    <Button onClick={handleTestPayment} disabled={processing} className="w-full h-12 text-sm font-semibold bg-primary hover:bg-primary/90 text-white gap-2">
                                                        {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><Zap className="h-4 w-4" /> Complete Purchase (Test)</>}
                                                    </Button>
                                                )}
                                            </>
                                        )}

                                        <div className="pt-2 border-t border-slate-100 space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Lock className="w-3.5 h-3.5 shrink-0" /> 256-bit SSL encrypted checkout
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <Shield className="w-3.5 h-3.5 shrink-0" /> Your payment info is never stored
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <p className="text-center text-xs text-slate-400">
                                    Need help? <a href="/contact" className="text-primary hover:underline">Contact support</a>
                                </p>
                            </div>
                        </div>
                    </div>
                    </>
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
