export interface BankDetails {
    bankName: string;
    branchName: string;
    accountHolder: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'Savings' | 'Current';
}

export interface KYCHistoryEntry {
    id: string;
    status: 'submitted' | 'verified' | 'rejected';
    timestamp: string;
    performedBy: string;
    notes?: string;
}

export interface PartnerKYC {
    aadhaarNumber: string;
    aadhaarFront: string;
    aadhaarBack: string;
    panNumber: string;
    panCard: string;
    photo: string;
    kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
    history: KYCHistoryEntry[];
    verificationStatus: 'unverified' | 'in_review' | 'verified' | 'suspended';
    verifiedAt: string | null;
    verifiedBy: string | null;
    rejectionReason: string;
}

export interface Partner {
    id: string;
    name: string;
    email: string;
    phone: string;
    altPhone?: string;
    referralCode: string;
    commissionPercent: number;
    status: 'active' | 'inactive' | 'suspended' | 'pending' | 'rejected';
    kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';

    // Location
    city: string;
    state: string;
    address?: string;
    pincode?: string;

    // Financial
    bankDetails?: BankDetails;
    totalSales: number;
    totalCommission: number;
    totalSubPartners: number;

    // MOU
    mouSigned: boolean;
    mouDate?: string;

    aadhaarNumber?: string;
    panNumber?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    panCard?: string;
    photo?: string;

    // Meta
    canAddSubPartners: boolean;
    designationAccess: boolean;
    joinedDate: string;
    lastActive?: string;

    // Links
    franchiseId?: string;
    franchiseName?: string;
}

export interface SubPartner {
    id: string;
    parentPartnerId: string;
    name: string;
    email: string;
    phone: string;
    referralCode: string;
    commissionPercent: number;
    status: 'active' | 'inactive';
    designation?: string;
    salesCount: number;
    totalRevenue: number;
    joinedDate: string;
}

export interface PartnerCommission {
    id: string;
    partnerId: string;
    partnerName: string;
    saleId: string;
    customerName: string;
    planName: string;
    saleAmount: number;
    commissionPercent: number;
    commissionAmount: number;
    status: 'pending' | 'processed' | 'paid';
    saleDate: string;
    payoutDate?: string;
}
