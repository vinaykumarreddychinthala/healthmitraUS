'use client';

import { useKYCStatus } from '@/hooks/useKYCStatus';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ClientAccessGuard({ children }: { children: React.ReactNode }) {
    const { kycSubmitted, verifiedCount, checking } = useKYCStatus();
    const pathname = usePathname();
    const router = useRouter();

    const isProtectedRoute = !pathname.startsWith('/api/') && !pathname.startsWith('/login') && !pathname.startsWith('/e-cards');

    useEffect(() => {
        if (!isProtectedRoute) return;

        if (!checking) {
            // Block access to everything if KYC is incomplete
            if (kycSubmitted === false) {
                router.replace('/e-cards');
                return;
            }

            // Block access to reimbursements if no cards are verified
            if (pathname.startsWith('/reimbursements') && verifiedCount === 0) {
                router.replace('/e-cards?error=verification_required');
            }
        }
    }, [kycSubmitted, verifiedCount, checking, isProtectedRoute, pathname, router]);

    // If it's a protected route and we are still checking, show a blank or loading state
    // to prevent flashing unauthorized content like "Your plan does not cover this service".
    if (isProtectedRoute && checking) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
        );
    }

    // Also if it's protected and kyc is false, don't render children while we wait for router.replace to execute
    if (isProtectedRoute && kycSubmitted === false) {
        return null;
    }

    if (isProtectedRoute && pathname.startsWith('/reimbursements') && verifiedCount === 0) {
        return null;
    }

    return <>{children}</>;
}
