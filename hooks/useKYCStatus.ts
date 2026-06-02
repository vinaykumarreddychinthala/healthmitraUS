'use client';

import { useState, useEffect } from 'react';

interface KYCStatusResult {
    kycSubmitted: boolean | null; // null = still checking
    verifiedCount: number;
    checking: boolean;
    refetch: () => void;
}

/**
 * Checks if ALL of the current user's active/pending members have submitted KYC.
 * This is the global gate hook — used across service pages.
 * Returns null while loading, true/false once checked.
 */
export function useKYCStatus(): KYCStatusResult {
    const [kycSubmitted, setKycSubmitted] = useState<boolean | null>(null);
    const [verifiedCount, setVerifiedCount] = useState<number>(0);
    const [checking, setChecking] = useState(true);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            setChecking(true);
            try {
                const res = await fetch('/api/kyc/global-status');
                if (!res.ok) { setKycSubmitted(null); return; }
                const data = await res.json();

                if (cancelled) return;
                setKycSubmitted(data.kycSubmitted === true);
                setVerifiedCount(data.verifiedCount || 0);
            } catch {
                if (!cancelled) setKycSubmitted(null);
            } finally {
                if (!cancelled) setChecking(false);
            }
        };

        check();
        return () => { cancelled = true; };
    }, [tick]);

    return { kycSubmitted, verifiedCount, checking, refetch: () => setTick(t => t + 1) };
}
