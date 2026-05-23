'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowRight } from 'lucide-react';

interface KYCGateBannerProps {
    context?: 'service' | 'ecard'; // where is the banner shown
}

export default function KYCGateBanner({ context = 'service' }: KYCGateBannerProps) {
    return (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-7 h-7 text-amber-600" />
            </div>
            <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-base">
                    {context === 'service'
                        ? 'Action Required: Complete Policy Holder Details'
                        : 'Complete KYC to Download Your E-Card'}
                </h3>
                <p className="text-amber-700 text-sm mt-1">
                    {context === 'service'
                        ? 'You must fill in your Policy Holder Details in the E-Card section before you can use any HealthMitra services.'
                        : 'Please complete your Policy Holder KYC details to generate and download your E-Card.'}
                </p>
            </div>
            <Link
                href="/e-cards"
                className="shrink-0 flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap shadow-md shadow-amber-200"
            >
                Complete Now <ArrowRight className="w-4 h-4" />
            </Link>
        </div>
    );
}
