"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetOTP, resetPasswordWithOTP } from "@/app/actions/password-reset";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    
    // Auth metadata returned from step 1
    const [authMeta, setAuthMeta] = useState<{ hash: string; expires: number; userId: string; maskedEmail: string } | null>(null);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const res = await requestPasswordResetOTP(email);
        
        if (res.success && res.data) {
            setAuthMeta(res.data);
            setStep(2);
        } else {
            setError(res.error || "Failed to send OTP");
        }
        setIsLoading(false);
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError("OTP must be 6 digits");
            return;
        }
        setError(null);
        setStep(3); // Proceed to password entry
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        setError(null);
        setIsLoading(true);

        if (!authMeta) return;

        const res = await resetPasswordWithOTP(authMeta.userId, newPassword, otp, authMeta.hash, authMeta.expires);
        
        if (res.success) {
            // Redirect to login with success message
            router.push('/login?reset=success');
        } else {
            setError(res.error || "Failed to reset password");
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-center p-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Reset Password</h1>
            
            {step === 1 && (
                <p className="text-slate-500 dark:text-slate-400 mb-8">Enter your registered Email or User ID (e.g. HM-XXXX)</p>
            )}
            {step === 2 && (
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    Enter the 6-digit OTP sent to <br/><span className="font-semibold text-slate-700 dark:text-slate-200">{authMeta?.maskedEmail}</span>
                </p>
            )}
            {step === 3 && (
                <p className="text-slate-500 dark:text-slate-400 mb-8">Create a new secure password</p>
            )}

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md border border-red-200 dark:border-red-800/30">
                    {error}
                </div>
            )}

            {/* STEP 1: Email/ID Request */}
            {step === 1 && (
                <form onSubmit={handleSendOTP} className="space-y-4 text-left">
                    <div>
                        <Label htmlFor="email">Email or User ID</Label>
                        <Input 
                            id="email" 
                            type="text" 
                            placeholder="you@example.com or HM-XXXXXX" 
                            className="mt-1"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Send OTP
                    </Button>
                </form>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-4 text-left">
                    <div>
                        <Label htmlFor="otp">6-Digit OTP</Label>
                        <Input 
                            id="otp" 
                            type="text" 
                            placeholder="123456" 
                            className="mt-1 text-center text-xl tracking-[0.5em] font-mono"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            required
                        />
                    </div>
                    <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
                        Verify OTP
                    </Button>
                    <button 
                        type="button" 
                        onClick={() => setStep(1)} 
                        className="w-full text-sm text-slate-500 hover:text-cyan-600 mt-2"
                    >
                        Change Email/ID
                    </button>
                </form>
            )}

            {/* STEP 3: New Password */}
            {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4 text-left">
                    <div>
                        <Label htmlFor="new-password">New Password</Label>
                        <Input 
                            id="new-password" 
                            type="password" 
                            className="mt-1"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input 
                            id="confirm-password" 
                            type="password" 
                            className="mt-1"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Update Password
                    </Button>
                </form>
            )}

            <div className="mt-6">
                <Link href="/login" className="text-sm text-cyan-600 hover:underline">
                    Back to Login
                </Link>
            </div>
        </div>
    );
}
