
'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CheckCircle, CreditCard, Shield, Loader2, ArrowLeft, AlertCircle, Star, Lock, Zap, User, Mail, Phone, Tag } from 'lucide-react';
import { loadRazorpay } from '@/lib/razorpay';
import { toast } from 'sonner';
import { validatePromoCode } from '@/app/actions/coupons';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from '@/components/client/StripePaymentForm';

interface Plan {
    id: string; name: string; description: string; price: number;
    duration_days: number; allowed_services: string[];
    is_active: boolean; is_featured: boolean; coverage_amount?: number;
}
interface GuestInfo { name: string; email: string; phone: string; planId: string; verified: boolean; }

const SERVICE_LABELS: Record<string, string> = {
    ambulance: 'Ambulance', medical_consultation: 'Doctor Consultation',
    diagnostic: 'Lab Tests / Diagnostic', caretaker: 'Caretaker', nursing: 'Nursing',
};

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
    const [promoTab, setPromoTab] = useState<'coupon' | 'referral'>('coupon');
    const [appliedCode, setAppliedCode] = useState<{ code: string; discount: number; type: string } | null>(null);
    const [validatingCode, setValidatingCode] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState<{ email: string } | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');

    const [otpStep, setOtpStep] = useState(1);
    const [newEmailOtp, setNewEmailOtp] = useState('');
    const [newEmailHash, setNewEmailHash] = useState('');

    useEffect(() => {
        // Read guest info from sessionStorage (set by checkout-auth page)
        const stored = sessionStorage.getItem('checkout_user');
        if (!stored) {
            toast.error('Please verify your email first.');
            router.push(`/checkout-auth/${planId}`);
            return;
        }
        const info: GuestInfo = JSON.parse(stored);
        if (!info.verified || info.planId !== planId) {
            toast.error('Session mismatch. Please start again.');
            router.push(`/checkout-auth/${planId}`);
            return;
        }
        setGuestInfo(info);
        setEditName(info.name);
        setEditEmail(info.email);
        setEditPhone(info.phone);

        const load = async () => {
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
                    body: JSON.stringify({ planId, amount: p.data?.price }),
                });
                const intentData = await intentRes.json();
                setStripeSettings({ enabled: true, publishableKey: stripe.data.publishableKey, clientSecret: intentData.clientSecret });
            }
            if (p.success) setPlan(p.data);
            else { toast.error('Plan not found'); router.push('/plans'); }
            setLoading(false);
        };
        load();
    }, [planId, router]);

    // Show in-page success screen instead of immediate redirect
    const onPurchaseSuccess = (_result: any) => {
        sessionStorage.removeItem('checkout_user');
        setPurchaseSuccess({ email: editEmail });
    };

    // Central purchase handler — uses editable user fields + referral code
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
            if (!paypalRef.current || !(window as any).paypal) return;
            (window as any).paypal.Buttons({
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
                onApprove: async (data: any) => {
                    setProcessing(true);
                    try {
                        // Capture via PayPal, then record purchase via guest endpoint
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
            }).render(paypalRef.current);
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
        setProcessing(true);
        try {
            const res = await fetch('/api/auth/send-custom-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone })
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
                    email: editEmail,
                    otp: newEmailOtp,
                    hash: newEmailHash,
                    name: editName,
                    phone: editPhone,
                    planId: plan?.id,
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
                handler: async (response: any) => {
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

    if (loading) return (
        <><Header /><div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div><Footer /></>
    );
    if (!plan) return null;

    const discount = appliedCode?.discount || 0;
    const baseAfterDiscount = Math.max(0, plan.price - discount);
    // India (Razorpay) → show ₹ with 18% GST. US (PayPal/Stripe) → show $ without tax
    const isIndia = razorpaySettings.enabled && !paypalSettings.enabled && !stripeSettings.enabled;
    const gstAmount = isIndia ? Math.round(baseAfterDiscount * 0.18) : 0;
    const total = baseAfterDiscount + gstAmount;
    const currency = isIndia ? '₹' : '$';
    const anyLivePayment = razorpaySettings.enabled || paypalSettings.enabled || stripeSettings.enabled;
    const stripePromise = stripeSettings.publishableKey ? loadStripe(stripeSettings.publishableKey) : null;

    const isEmailChanged = guestInfo && editEmail !== guestInfo.email;

    return (
        <>
            <Header />
            <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8 px-4 md:px-6">
                <div className="max-w-5xl mx-auto">

                    {/* ── SUCCESS SCREEN ──────────────────────────────────────── */}
                    {purchaseSuccess ? (
                        <div className="max-w-lg mx-auto py-16 text-center space-y-6 animate-in fade-in-50">
                            <div className="flex items-center justify-center">
                                <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle className="w-14 h-14 text-emerald-500" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful! 🎉</h2>
                                <p className="text-slate-600 text-lg">Welcome to HealthMitra</p>
                            </div>
                            <div className="p-5 bg-teal-50 border border-teal-200 rounded-2xl text-left space-y-2">
                                <p className="font-semibold text-teal-800">Your login credentials have been sent to:</p>
                                <p className="text-teal-700 font-mono text-sm break-all">{purchaseSuccess.email}</p>
                                <p className="text-sm text-teal-600 mt-2">Check your inbox for your <strong>User ID</strong> and <strong>Password</strong> to access the Customer Portal.</p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                <button
                                    onClick={() => router.push('/login')}
                                    className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded-xl transition-all"
                                >
                                    Login to Customer Portal
                                </button>
                                <button
                                    onClick={() => router.push('/')}
                                    className="flex items-center justify-center gap-2 border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium px-8 py-3 rounded-xl transition-all"
                                >
                                    Back to Home
                                </button>
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

                    <div className="grid lg:grid-cols-5 gap-8">
                        {/* LEFT: Plan Details */}
                        <div className="lg:col-span-3 space-y-4">
                            {/* Plan Card */}
                            <Card className="border border-slate-200 shadow-sm overflow-hidden">
                                <div className="h-1.5 bg-gradient-to-r from-primary to-cyan-400" />
                                <CardHeader className="pb-3 pt-5">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg text-slate-800">Your Selected Plan</CardTitle>
                                        {plan.is_featured && <Badge className="bg-amber-100 text-amber-700"><Star className="w-3 h-3 mr-1 fill-amber-500" /> Popular</Badge>}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-start gap-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                            <Shield className="w-7 h-7 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 text-lg">{plan.name}</h3>
                                            <p className="text-slate-500 text-sm mt-0.5">{plan.description}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs border-primary/30 text-primary">{plan.duration_days} days</Badge>
                                                {plan.coverage_amount && <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50">${Number(plan.coverage_amount).toLocaleString()} cover</Badge>}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-2xl font-bold text-slate-900">${Number(plan.price).toLocaleString()}</p>
                                            <p className="text-xs text-slate-400">base price</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Services */}
                            {(plan.allowed_services || []).length > 0 && (
                                <Card className="border border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3"><CardTitle className="text-base text-slate-800">What&apos;s Included</CardTitle></CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {plan.allowed_services.map((s, i) => (
                                                <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600 py-1">
                                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                                    </div>
                                                    {SERVICE_LABELS[s] || s}
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Price Breakdown — GST aware */}
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader className="pb-3"><CardTitle className="text-base text-slate-800">Price Breakdown</CardTitle></CardHeader>
                                <CardContent className="pt-0 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Base Price</span>
                                        <span className="text-slate-800 font-medium">{currency}{Number(plan.price).toLocaleString()}</span>
                                    </div>
                                    {appliedCode && (
                                        <div className="flex justify-between text-sm text-emerald-600 font-medium">
                                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Discount ({appliedCode.code})</span>
                                            <span>-{currency}{appliedCode.discount.toLocaleString()}</span>
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

                            {/* Coupon Code / Referral Code Tabs */}
                            <Card className="border border-slate-200 shadow-sm">
                                <CardHeader className="pb-0 pt-4">
                                    <div className="flex border-b border-slate-200">
                                        {(['coupon', 'referral'] as const).map(tab => (
                                            <button key={tab} onClick={() => setPromoTab(tab)}
                                                className={`flex-1 py-2 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${promoTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                                {tab === 'coupon' ? 'Coupon Code' : 'Referral Code'}
                                            </button>
                                        ))}
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-4">
                                    {promoTab === 'coupon' ? (
                                        !appliedCode ? (
                                            <div className="flex gap-2">
                                                <Input placeholder="Enter coupon code" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} disabled={validatingCode} />
                                                <Button onClick={handleApplyPromo} disabled={validatingCode || !promoCode.trim()} variant="outline" className="shrink-0 border-primary text-primary hover:bg-primary/5">
                                                    {validatingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <span className="text-sm font-bold text-emerald-700">{appliedCode.code} applied ✓</span>
                                                <Button variant="ghost" size="sm" onClick={() => { setAppliedCode(null); setPromoCode(''); }} className="text-slate-400 hover:text-rose-500">Remove</Button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="flex gap-2">
                                            <Input placeholder="Enter referral code" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())} />
                                            <Button variant="outline" className="shrink-0 border-slate-300 text-slate-600" onClick={() => { if (referralCode.trim()) toast.success('Referral code saved!'); }}>
                                                Save
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
                                    </CardHeader>
                                    <CardContent className="pt-0 space-y-4">
                                        {isEmailChanged ? (
                                            <div className="space-y-4">
                                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                                                    <AlertCircle className="w-5 h-5 mb-2 text-amber-600" />
                                                    You changed your email from <strong className="font-semibold">{guestInfo.email}</strong> to <strong className="font-semibold">{editEmail}</strong>. 
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
                                                    <Button onClick={handleSendNewEmailOTP} disabled={processing} className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11">
                                                        {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Verify New Email'}
                                                    </Button>
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

                                                {razorpaySettings.enabled && (
                                                    <Button onClick={handleRazorpay} disabled={processing} className="w-full h-12 text-sm font-semibold bg-[#072654] hover:bg-[#061e42] text-white gap-2">
                                                        {processing ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4" /> Pay with Razorpay</>}
                                                    </Button>
                                                )}

                                                {paypalSettings.enabled && (
                                                    <div>
                                                        {processing && <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Completing payment...</div>}
                                                        <div ref={paypalRef} id="paypal-button-container" className={processing ? 'opacity-40 pointer-events-none' : ''} />
                                                    </div>
                                                )}

                                                {stripeSettings.enabled && stripeSettings.clientSecret && stripePromise && (
                                                    <Elements stripe={stripePromise} options={{ clientSecret: stripeSettings.clientSecret }}>
                                                        <StripePaymentForm total={total} planId={plan.id} promoCode={appliedCode?.code} onSuccess={handleStripeSuccess} />
                                                    </Elements>
                                                )}

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
