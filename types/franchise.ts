export type KYCStatus = 'pending' | 'submitted' | 'verified' | 'rejected';
export type VerificationStatus = 'unverified' | 'in_review' | 'verified' | 'suspended';

export interface FranchiseKYC {
    aadhaarNumber: string;
    aadhaarFront: string;
    aadhaarBack: string;
    panNumber: string;
    panCard: string;
    photo: string;
    kycStatus: KYCStatus;
    history: KYCHistoryEntry[];
    verificationStatus: VerificationStatus;
    verifiedAt: string | null;
    verifiedBy: string | null;
    rejectionReason: string;
}

export interface KYCHistoryEntry {
    id: string;
    status: 'submitted' | 'verified' | 'rejected';
    timestamp: string;
    performedBy: string;
    notes?: string;
}

export interface Franchise {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    contact: string;
    altContact: string;
    email: string;
    password?: string;
    referralCode: string;
    website: string;
    gst: string;
    commissionPercent: number;
    kycStatus: KYCStatus;
    verificationStatus: VerificationStatus;
    address: string;
    city: string;
    state: string;
    payoutDelay: number;
    status: 'active' | 'inactive';
    createdAt: string;
    totalPartners: number;
    totalRevenue: number;
    aadhaarNumber?: string;
    panNumber?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    panCard?: string;
    photo?: string;
}

export interface FranchiseModule {
    id: string;
    sno: number;
    moduleName: string;
    addAccess: boolean;
    editAccess: boolean;
    deleteAccess: boolean;
    uploadAccess: boolean;
    downloadAccess: boolean;
}

export interface FranchiseActivity {
    id: string;
    franchiseId: string;
    action: string;
    description: string;
    timestamp: string;
    performedBy: string;
}

export interface FranchisePartner {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: 'active' | 'inactive';
    joinedAt: string;
    plansCount: number;
    revenue: number;
}

export const DEFAULT_MODULES: FranchiseModule[] = [
    { id: 'mod_1', sno: 1, moduleName: 'Plans Management', addAccess: true, editAccess: true, deleteAccess: false, uploadAccess: true, downloadAccess: true },
    { id: 'mod_2', sno: 2, moduleName: 'Service Requests', addAccess: true, editAccess: true, deleteAccess: false, uploadAccess: false, downloadAccess: true },
    { id: 'mod_3', sno: 3, moduleName: 'PHR Management', addAccess: false, editAccess: false, deleteAccess: false, uploadAccess: true, downloadAccess: true },
    { id: 'mod_4', sno: 4, moduleName: 'CMS / Content', addAccess: true, editAccess: true, deleteAccess: true, uploadAccess: true, downloadAccess: true },
    { id: 'mod_5', sno: 5, moduleName: 'Partner Management', addAccess: true, editAccess: true, deleteAccess: false, uploadAccess: false, downloadAccess: true },
    { id: 'mod_6', sno: 6, moduleName: 'Reports & Analytics', addAccess: false, editAccess: false, deleteAccess: false, uploadAccess: false, downloadAccess: true },
    { id: 'mod_7', sno: 7, moduleName: 'User Management', addAccess: true, editAccess: true, deleteAccess: false, uploadAccess: false, downloadAccess: false },
    { id: 'mod_8', sno: 8, moduleName: 'City Management', addAccess: true, editAccess: true, deleteAccess: true, uploadAccess: false, downloadAccess: false },
];
