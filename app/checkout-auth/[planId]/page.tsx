'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowRight, ShieldCheck, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Turnstile } from '@/components/ui/turnstile';

export default function CheckoutAuthPage({ params }: { params: Promise<{ planId: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();

    const [step, setStep] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string>('');

    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [otp, setOtp] = useState('');
    const [hash, setHash] = useState('');

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.phone) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/send-custom-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, turnstileToken })
            });
            const data = await res.json();
            if (data.success) {
                setHash(data.hash);
                setStep(2);
                toast.success('OTP sent to your email!');
            } else {
                toast.error(data.error || 'Failed to send OTP');
            }
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length < 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-custom-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    otp,
                    hash,
                    name: formData.name,
                    phone: formData.phone,
                    planId: resolvedParams.planId,
                })
            });
            const data = await res.json();

            if (data.success) {
                // Store verified user info in sessionStorage for the checkout page
                sessionStorage.setItem('checkout_user', JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    planId: resolvedParams.planId,
                    verified: true,
                }));
                toast.success('Verified! Redirecting to checkout...');
                router.push(`/checkout/${resolvedParams.planId}`);
            } else {
                toast.error(data.error || 'Invalid OTP. Please try again.');
                setLoading(false);
            }
        } catch {
            toast.error('Verification failed. Please try again.');
            setLoading(false);
        }
    };

    return (
        <>
            <Header />
            <main className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 py-12 px-4">
                <Card className="w-full max-w-md shadow-xl border-slate-200">
                    <div className="h-1.5 bg-gradient-to-r from-primary to-cyan-400" />
                    <CardHeader className="text-center pb-6">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            {step === 1 ? (
                                <ShieldCheck className="w-6 h-6 text-primary" />
                            ) : (
                                <Mail className="w-6 h-6 text-primary" />
                            )}
                        </div>
                        <CardTitle className="text-2xl font-bold text-slate-800">
                            {step === 1 ? 'Almost There!' : 'Verify Your Email'}
                        </CardTitle>
                        <CardDescription className="text-slate-500 mt-2">
                            {step === 1
                                ? 'We need a few details before you proceed to payment.'
                                : `We sent a 6-digit code to ${formData.email}`}
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {step === 1 ? (
                            <form onSubmit={handleSendOTP} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                                    <Input
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Email Address</label>
                                    <Input
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Phone Number</label>
                                    <Input
                                        type="tel"
                                        placeholder="+1 (555) 000-0000"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                        className="h-11"
                                    />
                                </div>

                                <Turnstile onVerify={(token) => setTurnstileToken(token)} />

                                <Button type="submit" className="w-full h-11 mt-6 text-base" disabled={loading || !turnstileToken}>
                                    {loading ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending OTP...</>
                                    ) : (
                                        <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOTP} className="space-y-6">
                                <div className="space-y-2 text-center">
                                    <label className="text-sm font-medium text-slate-700">Enter OTP</label>
                                    <Input
                                        type="text"
                                        placeholder="123456"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                                        required
                                        className="h-14 text-center text-2xl tracking-[0.25em] font-bold"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base"
                                    disabled={loading || otp.length < 6}
                                >
                                    {loading ? (
                                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying...</>
                                    ) : (
                                        'Verify & Proceed to Checkout'
                                    )}
                                </Button>

                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => { setStep(1); setOtp(''); }}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        ← Change Email
                                    </button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </main>
            <Footer />
        </>
    );
}
