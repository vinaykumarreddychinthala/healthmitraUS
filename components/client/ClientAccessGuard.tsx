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
        // Global KYC redirects have been removed based on user request.
        // Users can now navigate freely, but specific actions (like Wallet Withdrawal)
        // are restricted locally.
    }, [kycSubmitted, verifiedCount, checking, isProtectedRoute, pathname, router]);

    // We no longer block rendering based on KYC status
    // if (isProtectedRoute && checking) { ... }
    
    return <>{children}</>;
}
