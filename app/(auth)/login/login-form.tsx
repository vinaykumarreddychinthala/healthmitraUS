"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { login } from "@/app/actions/auth";
import { Loader2, ArrowRight, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect } from "react";

function LoginFormContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get("message");
  const purchased = searchParams.get("purchased") === 'true';

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    try {
      const result = await login(formData);
      if (result?.error) {
        toast.error("Login Failed", { description: result.error });
      } else if (result?.redirect) {
        router.replace(result.redirect);
        router.refresh();
      }
    } catch (err: any) {
      toast.error("Login Failed", {
        description: "Please check your credentials and try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-left-8 duration-500 delay-100">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {purchased ? 'Access Your Dashboard' : 'Welcome back'}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {purchased ? 'Use the credentials sent to your email' : 'Sign in to your account'}
        </p>
        {purchased && (
          <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-200 text-left space-y-1">
            <p className="font-bold text-emerald-800 flex items-center gap-2">✅ Purchase Successful!</p>
            <p>We&apos;ve sent your <strong>User ID</strong> and <strong>Password</strong> to your email.</p>
            <p className="text-xs text-emerald-600 mt-1">Enter those credentials below to access your Customer Panel.</p>
          </div>
        )}
        {message && !purchased && (
          <div className={`mt-4 p-3 text-sm rounded-xl border text-left ${
            searchParams.get("expired") === 'true'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-green-50 text-green-600 border-green-100'
          }`}>
            {searchParams.get("expired") === 'true' && (
              <p className="font-bold text-red-800 flex items-center gap-2 mb-0.5">⚠️ Access Blocked</p>
            )}
            <p>{message}</p>
          </div>
        )}
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">User ID</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              name="email"
              type="text"
              placeholder="HM-XXXXXX or Email"
              required
              className="pl-10 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-teal-600 hover:text-teal-500"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="pl-10 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#113a40] hover:bg-[#0d2b30] text-white h-11 shadow-lg shadow-teal-900/20"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Removed Sign Up Link as per requirements */}
    </div>
  );
}

export default function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
