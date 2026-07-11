import React from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, User, ShieldCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getPurchaseDetail } from "@/app/actions/ecards";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { success, data: purchase } = await getPurchaseDetail(id);

    if (!success || !purchase) {
        notFound();
    }

    const planDetails = purchase.plans;

    return (
        <div className="container mx-auto max-w-6xl py-6 animate-in fade-in-50">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/my-purchases">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{planDetails.name || 'Unknown Plan'}</h1>
                    <p className="text-slate-500 font-mono text-sm">ID: {id.slice(0, 8)}</p>
                </div>
                <div className="ml-auto flex gap-2">
                    <Badge variant={purchase.status === 'active' ? 'default' : 'destructive'} className="capitalize bg-teal-600">
                        {purchase.status}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COL: Quick Stats & Members */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Coverage Card */}
                    <div className="p-6 bg-teal-700 rounded-2xl text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <ShieldCheck className="h-32 w-32 text-white" />
                        </div>
                        <div className="relative z-10 flex justify-between items-start mb-8">
                            <div>
                                <p className="text-teal-100 text-sm mb-1">Total Coverage</p>
                                <h2 className="text-2xl font-bold">No-limit as per plan</h2>
                            </div>
                            <ShieldCheck className="h-10 w-10 text-teal-200 opacity-50" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-4">
                            <div>
                                <p className="text-xs text-teal-100">Valid Until</p>
                                <p className="font-semibold">{purchase.valid_until ? new Date(purchase.valid_until).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-teal-100">Plan Type</p>
                                <p className="font-semibold">{planDetails.type || 'Standard'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Members */}
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900">Insured Details</h3>
                        </div>
                        <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-200">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{purchase.member?.name || 'Unknown'}</p>
                                    <p className="text-xs text-slate-500">{purchase.member?.relation || 'Self'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: Payment Info */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <h3 className="font-bold text-slate-900 mb-4">Payment Details</h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Amount Paid</span>
                                <span className="font-semibold">$ {planDetails.price?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100">
                                <span className="text-slate-500">Purchase Date</span>
                                <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full mt-4 gap-2" disabled>
                            <CreditCard className="h-4 w-4" /> Invoice Unavailable
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
