export type ECardStatus = 'active' | 'pending' | 'expired';

export interface ECardMember {
    id: string;
    name: string;
    relation: string;
    dob: string;
    age: number;
    gender: 'M' | 'F' | 'Other';
    bloodGroup: string;
    memberId: string;
    photoUrl?: string;
    planId: string;
    planName: string;
    planPrice?: number;
    validFrom: string;
    validTill: string;
    policyNo: string;
    policyId?: string;
    issuedDate: string;
    emergencyContact: string;
    coverageAmount?: number;
    status: ECardStatus;
    cardUniqueId: string;
    adminVerified?: boolean;
    planDescription?: string;
    planFeatures?: string[];
    aadhaarLast4?: string;
    mobile?: string;
    email?: string;
    kycSubmitted?: boolean;
}

export interface ECardGenerationState {
    step: 1 | 2 | 3;
    selectedMemberId: string | null;
    formData: ECardFormData;
}

export interface ECardFormData {
    fullName: string;
    dob: string;
    gender: string;
    bloodGroup: string;
    mobile: string;
    email: string;
    height: string;
    weight: string;
    conditions: string;
    nomineeName: string;
    nomineeRelation: string;
    photo?: File | null;
    aadhaarNumber?: string;
    address?: string;
}

// Generate a unique card ID
export function generateCardUniqueId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'HM-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    result += '-';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Calculate validity dates (1 year)
export function getValidityDates(): { validFrom: string; validTill: string } {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const formatDate = (d: Date) =>
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    return {
        validFrom: formatDate(today),
        validTill: formatDate(nextYear)
    };
}
