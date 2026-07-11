import Link from "next/link";
import { ShieldCheck, CheckCircle, Download, Users, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PurchasedPlan } from "@/types/purchase";

interface PlanCardProps {
    plan: PurchasedPlan;
}

export function PlanCard({ plan }: PlanCardProps) {
    const isExpired = plan.status === 'expired';

    const getStatusBadge = () => {
        switch (plan.status) {
            case 'active':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-100">Active</Badge>;
            case 'expired':
                return <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">Expired</Badge>;
            case 'expiring_soon':
                return <Badge className="bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-100">Expiring Soon</Badge>;
            default:
                return null;
        }
    };

    const validityPercentage = Math.max(0, Math.min(100, (plan.daysRemaining / 365) * 100));

    return (
        <div className={cn(
            "relative rounded-xl border-2 bg-white p-6 shadow-md transition-all duration-300 hover:shadow-lg",
            plan.status === 'active' ? "border-emerald-200" : "border-slate-200"
        )}>

            {/* Status Badge Absolute Top Right */}
            <div className="absolute right-6 top-6">
                {getStatusBadge()}
            </div>

            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-teal-50 border border-teal-100 text-teal-600">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                    <p className="text-sm font-medium text-slate-500">Plan ID: {plan.policyNumber}</p>
                    <p className="text-sm text-slate-400">Purchased on: {new Date(plan.purchaseDate).toLocaleDateString("en-IN", {
                        year: "numeric", month: "short", day: "numeric"
                    })}</p>
                </div>
                <div className="ml-auto mr-24 hidden md:block">
                    <div className="ml-auto mr-24 hidden md:block">
                        <Button asChild variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                            <Link href={`/my-purchases/${plan.id}`}>
                                View Details
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            <hr className="border-slate-100 mb-6" />

            {/* Coverage Details */}
            <div className="mb-6 rounded-lg bg-slate-50 p-4 border border-slate-100">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Coverage Amount</p>
                        <p className="font-semibold text-slate-800 text-sm">No-limit as per plan</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Members Covered</p>
                        <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-slate-400" />
                            <p className="font-semibold text-slate-800">{plan.membersCovered} Members</p>
                        </div>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Valid From</p>
                        <p className="font-semibold text-slate-800">{new Date(plan.validFrom).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1">Valid Until</p>
                        <p className="font-semibold text-slate-800">{new Date(plan.validUntil).toLocaleDateString("en-IN", { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                {!isExpired && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Validity Status</span>
                            <span className="font-medium text-emerald-600">{plan.daysRemaining} days remaining</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                                style={{ width: `${validityPercentage}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 mb-6">
                <Button variant="outline" size="sm" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                    <Download className="h-4 w-4" /> Download Policy
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                    <Users className="h-4 w-4" /> Manage Members
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                    <CreditCard className="h-4 w-4" /> Get E-Card
                </Button>
                {/* Mobile View Details Button */}
                {/* Mobile View Details Button */}
                <Button asChild variant="ghost" size="sm" className="md:hidden ml-auto text-teal-600">
                    <Link href={`/my-purchases/${plan.id}`}>
                        View Details →
                    </Link>
                </Button>
            </div>

            {/* Benefits Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4">
                {plan.benefits.slice(0, 6).map((benefit) => (
                    <div key={benefit.id} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-sm text-slate-600 truncate">{benefit.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
