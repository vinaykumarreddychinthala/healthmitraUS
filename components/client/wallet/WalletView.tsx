'use client';

import React, { useState } from 'react';
import {
    Wallet, Upload, Download, ArrowDownLeft, ArrowUpRight, RefreshCw,
    CreditCard, Clock, AlertCircle, Receipt, CheckCircle, Info, ChevronRight,
    TrendingUp,
} from 'lucide-react';
import AddMoneyModal from '@/components/client/wallet/AddMoneyModal';
import WithdrawalModal from '@/components/client/wallet/WithdrawalModal';
import TransactionHistory from '@/components/client/wallet/TransactionHistory';
import { toast } from 'sonner';

interface WalletViewProps {
    wallet: any;
    stats: any;
    transactions?: any[];
    billRefunds?: any[];
    userName?: string;
    canWithdraw?: boolean;
}

export function WalletView({
    wallet,
    stats,
    transactions = [],
    billRefunds = [],
    userName = '',
    canWithdraw = true,
}: WalletViewProps) {
    const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

    const totalBalance = Number(wallet?.balance || 0);
    // added_money = top-ups via Stripe (not withdrawable)
    const addedMoney = Number(wallet?.added_money || 0);
    // bill refund balance = total minus added top-ups (withdrawable)
    const billRefundBalance = Math.max(0, totalBalance - addedMoney);

    const todayWithdrawals = wallet?.todayWithdrawals || 0;
    const MAX_DAILY_WITHDRAWALS = 5;
    const remainingWithdrawals = Math.max(0, MAX_DAILY_WITHDRAWALS - todayWithdrawals);

    const handleWithdrawClick = () => {
        if (!canWithdraw) {
            toast.error('Withdrawal Locked', {
                description: 'You must complete and verify KYC for all your plan members before you can withdraw from your wallet.',
            });
            return;
        }
        if (billRefundBalance <= 0) {
            toast.error('No Withdrawable Balance', {
                description: 'Only approved bill refunds can be withdrawn. Top-up amounts are for service payments only.',
            });
            return;
        }
        setIsWithdrawOpen(true);
    };

    const handleAddMoneySuccess = () => {
        // Reload page to reflect new balance
        window.location.reload();
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800">My Wallet</h1>
                <p className="text-slate-500 text-sm">Manage your wallet balance and transactions</p>
            </div>

            {/* Daily Withdrawal Limit Banner */}
            <div className={`p-4 rounded-xl flex items-center justify-between ${remainingWithdrawals <= 2 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center gap-3">
                    <Clock className={remainingWithdrawals <= 2 ? 'text-amber-600' : 'text-blue-600'} size={20} />
                    <div>
                        <p className={`font-semibold ${remainingWithdrawals <= 2 ? 'text-amber-800' : 'text-blue-800'}`}>
                            Daily Withdrawal Limit
                        </p>
                        <p className={`text-sm ${remainingWithdrawals <= 2 ? 'text-amber-600' : 'text-blue-600'}`}>
                            {remainingWithdrawals} of {MAX_DAILY_WITHDRAWALS} withdrawals remaining today
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {[...Array(MAX_DAILY_WITHDRAWALS)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${i < todayWithdrawals ? 'bg-slate-300' : 'bg-teal-500'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Balance Card & Actions */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Main Balance Card */}
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-teal-200/50 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-emerald-100 font-medium text-sm mb-2 flex items-center gap-2">
                                <Wallet size={16} /> TOTAL WALLET BALANCE
                            </h2>
                            <div className="text-4xl font-bold mb-4">
                                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>

                            {/* Balance Breakdown */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                                    <div className="flex items-center gap-2 text-emerald-100 text-xs mb-1">
                                        <Upload size={12} /> Added via Stripe
                                    </div>
                                    <p className="text-xl font-bold">
                                        ${addedMoney.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-emerald-200 mt-1 flex items-center gap-1">
                                        <AlertCircle size={10} /> For services only
                                    </p>
                                </div>
                                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 border border-white/30">
                                    <div className="flex items-center gap-2 text-white text-xs mb-1">
                                        <Receipt size={12} /> Bill Refunds
                                    </div>
                                    <p className="text-xl font-bold">
                                        ${billRefundBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[10px] text-emerald-100 mt-1 flex items-center gap-1">
                                        <CheckCircle size={10} /> Withdrawable
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setIsAddMoneyOpen(true)}
                                    className="bg-white text-teal-700 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <Upload size={16} /> Add Money
                                </button>
                                <button
                                    onClick={handleWithdrawClick}
                                    className="bg-teal-700/50 hover:bg-teal-700 text-white border border-teal-400/30 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 backdrop-blur-sm"
                                >
                                    <Download size={16} /> Withdraw
                                </button>
                            </div>
                        </div>

                        {/* Decorative */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-10 -mb-10 blur-xl" />
                    </div>

                    {/* Info Banner */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                        <Info className="text-slate-400 flex-shrink-0 mt-0.5" size={18} />
                        <div className="text-sm text-slate-600">
                            <p className="font-medium text-slate-700 mb-1">How Wallet Works:</p>
                            <ul className="space-y-1 text-xs">
                                <li>• <strong>Added Money (Stripe)</strong>: Use for paying services only — not withdrawable</li>
                                <li>• <strong>Bill Refunds</strong>: From approved reimbursements — can be withdrawn to bank</li>
                                <li>• Maximum <strong>5 withdrawals per day</strong></li>
                            </ul>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <ArrowDownLeft size={12} />
                                </span>
                                CREDITED
                            </div>
                            <p className="text-lg font-bold text-slate-800">
                                ${stats.totalCredited.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{stats.creditedCount} txns</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
                                <span className="w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                                    <ArrowUpRight size={12} />
                                </span>
                                DEBITED
                            </div>
                            <p className="text-lg font-bold text-slate-800">
                                ${stats.totalDebited.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{stats.debitedCount} txns</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <RefreshCw size={12} />
                                </span>
                                THIS MONTH
                            </div>
                            <p className="text-lg font-bold text-slate-800">
                                ${stats.thisMonthSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{stats.thisMonthCount} txns</p>
                        </div>
                    </div>

                    {/* Withdrawable Bills Section */}
                    {billRefunds.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Receipt size={18} className="text-teal-600" /> Withdrawable Bill Refunds
                                </h3>
                                <span className="text-sm text-teal-600 font-semibold">
                                    ${billRefundBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {billRefunds.map((bill: any) => (
                                    <div key={bill.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                <CheckCircle className="text-emerald-600" size={18} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{bill.type}</p>
                                                <p className="text-xs text-slate-500">{bill.id} • {bill.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-600">
                                                ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </p>
                                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                Withdrawable
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-3 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={handleWithdrawClick}
                                    className="w-full py-2 text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center justify-center gap-1"
                                >
                                    Withdraw Now <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Transaction History */}
                    <TransactionHistory transactions={transactions} />
                </div>

                {/* Right Col: Sidebar */}
                <div className="hidden lg:block lg:col-span-1 space-y-6">
                    {/* Add Money CTA */}
                    <div className="bg-gradient-to-b from-emerald-500 to-teal-600 rounded-2xl p-6 text-white">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="font-bold text-center mb-2">Add Money via Stripe</h3>
                        <p className="text-sm text-emerald-100 text-center mb-4">
                            Securely top up your wallet using your credit or debit card.
                        </p>
                        <ul className="text-xs space-y-1.5 mb-5">
                            <li className="flex items-center gap-2"><CheckCircle size={12} /> Instant credit</li>
                            <li className="flex items-center gap-2"><CheckCircle size={12} /> Secured by Stripe</li>
                            <li className="flex items-center gap-2"><CheckCircle size={12} /> 256-bit SSL encryption</li>
                        </ul>
                        <button
                            onClick={() => setIsAddMoneyOpen(true)}
                            className="w-full py-2.5 bg-white text-teal-700 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors shadow-sm"
                        >
                            Add Money Now
                        </button>
                    </div>

                    {/* Withdraw CTA */}
                    <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-2xl p-6 text-white">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Download size={22} />
                        </div>
                        <h3 className="font-bold text-center mb-2">Withdraw Refunds</h3>
                        <p className="text-sm text-slate-300 text-center mb-4">
                            Transfer your approved bill refund balance to your bank account.
                        </p>
                        <div className="bg-white/10 rounded-xl p-3 mb-4 text-center">
                            <p className="text-xs text-slate-400 mb-1">Available to withdraw</p>
                            <p className="text-xl font-bold text-white">
                                ${billRefundBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <button
                            onClick={handleWithdrawClick}
                            disabled={billRefundBalance <= 0}
                            className="w-full py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Request Withdrawal
                        </button>
                    </div>

                    {/* Help */}
                    <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
                        <h3 className="font-bold text-sky-900 mb-2 text-sm">Need Help?</h3>
                        <p className="text-xs text-sky-800 mb-3">
                            Having trouble with your wallet balance or a transaction?
                        </p>
                        <button className="text-xs font-bold text-sky-600 hover:text-sky-700">
                            Contact Support →
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddMoneyModal
                isOpen={isAddMoneyOpen}
                onClose={() => setIsAddMoneyOpen(false)}
                currentBalance={totalBalance}
                onSuccess={handleAddMoneySuccess}
            />

            <WithdrawalModal
                isOpen={isWithdrawOpen}
                onClose={() => setIsWithdrawOpen(false)}
                currentBalance={billRefundBalance}
                userName={userName}
            />
        </div>
    );
}
