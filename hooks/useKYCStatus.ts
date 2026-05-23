'use client';

import { useState, useEffect } from 'react';

interface KYCStatusResult {
    kycSubmitted: boolean | null; // null = still checking
    checking: boolean;
    memberId: string | null;
    refetch: () => void;
}

/**
 * Checks if the current user's PRIMARY (Self) member has submitted KYC.
 * This is the global gate hook — used across service pages.
 * Returns null while loading, true/false once checked.
 */
export function useKYCStatus(): KYCStatusResult {
    const [kycSubmitted, setKycSubmitted] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);
    const [memberId, setMemberId] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const check = async () => {
            setChecking(true);
            try {
                // Step 1: Get the user's primary (Self) member
                const memberRes = await fetch('/api/kyc/member');
                if (!memberRes.ok) { setKycSubmitted(null); return; }
                const memberData = await memberRes.json();

                if (!memberData.memberId) {
                    // No member yet (plan not purchased or member not created)
                    setKycSubmitted(null);
                    return;
                }

                if (cancelled) return;
                setMemberId(memberData.memberId);

                // Step 2: Check KYC status for that member
                const kycRes = await fetch(`/api/kyc?memberId=${memberData.memberId}`);
                const kycData = await kycRes.json();
                if (cancelled) return;
                setKycSubmitted(kycData.kycSubmitted === true);
            } catch {
                if (!cancelled) setKycSubmitted(null);
            } finally {
                if (!cancelled) setChecking(false);
            }
        };

        check();
        return () => { cancelled = true; };
    }, [tick]);

    return { kycSubmitted, checking, memberId, refetch: () => setTick(t => t + 1) };
}
