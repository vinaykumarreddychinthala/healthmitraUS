export type PlanStatus = 'active' | 'expired' | 'expiring_soon';
export type ECardStatus = 'active' | 'pending' | 'expired';
export type ServiceType = 'service_request' | 'reimbursement' | 'wallet_transaction' | 'e_card' | 'purchase';
export type RequestStatus = 'pending' | 'completed' | 'approved' | 'rejected';
export type NotificationType = 'success' | 'warning' | 'info' | 'error';

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
}

export interface ActivePlan {
    id: string;
    planId: string;
    name: string;
    status: PlanStatus;
    validUntil: string;
    daysRemaining: number;
    coverageAmount: number;
}

export interface ECardStatusData {
    status: ECardStatus;
    totalCards: number;
    activeCards: number;
}

export interface WalletData {
    balance: number;
    currency: string;
    minimumBalance: number;
}

export interface VoucherData {
    available: number;
    used: number;
    expired: number;
    totalValue: number;
}

export interface ServiceData {
    activeServices: number;
    completedThisMonth: number;
    pendingApproval: number;
}

export interface MembersData {
    totalMembers: number;
    withActiveCards: number;
    familyMembers: { name: string; relation: string; planId?: string; status?: string }[];
}

export interface ReimbursementData {
    totalClaimed: number;
    approved: number;
    pending: number;
    rejected: number;
}

export interface PendingRequests {
    total: number;
    breakdown: {
        serviceRequests: number;
        reimbursements: number;
    };
    byPlan?: Record<string, { total: number; serviceRequests: number; reimbursements: number }>;
}

export interface RecentActivity {
    id: string;
    type: ServiceType;
    title: string;
    description: string;
    status: RequestStatus;
    timestamp: string;
    relatedId?: string;
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    relatedUrl?: string;
}

export interface DashboardData {
    user: User;
    activePlans: ActivePlan[];
    eCardStatus: ECardStatusData;
    wallet: WalletData;
    vouchers: VoucherData;
    services: ServiceData;
    members: MembersData;
    reimbursementSummary: ReimbursementData;
    pendingRequests: PendingRequests;
    recentActivity: RecentActivity[];
    notifications: Notification[];
}

import { PurchasedPlan } from './purchase';
export type { PurchasedPlan };

export interface MyPurchasesData {
    plans: PurchasedPlan[];
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    error?: string;
}
