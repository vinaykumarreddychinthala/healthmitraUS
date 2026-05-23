"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    FileText,
    Users,
    Settings,
    LogOut,
    Percent,
    MessageSquare,
    CreditCard,
    BarChart3,
    ClipboardCheck,
    MapPin,
    LayoutTemplate,
    HeartPulse,
    Building2,
    Handshake,
    Headphones,
    Wallet,
    Mail,
    Bell,
    UserPlus,
    TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signout } from "@/app/actions/auth";
import { toast } from "sonner";

export const ADMIN_NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: FileText, label: 'Plans Management', href: '/admin/plans' },
    { icon: Users, label: 'User Management', href: '/admin/users' },
    { icon: UserPlus, label: 'Customer Management', href: '/admin/customers' },
    { icon: MapPin, label: 'Locations', href: '/admin/locations' },
    { icon: LayoutTemplate, label: 'CMS Manager', href: '/admin/cms/pages' },
    { icon: Percent, label: 'Coupons', href: '/admin/coupons' },
    { icon: MessageSquare, label: 'Service Requests', href: '/admin/service-requests' },
    { icon: HeartPulse, label: 'PHR Management', href: '/admin/phr' },
    { icon: Building2, label: 'Franchise Management', href: '/admin/franchises' },
    { icon: Handshake, label: 'Partner Management', href: '/admin/partners' },
    { icon: Headphones, label: 'Call Centre', href: '/admin/call-centre' },
    { icon: CreditCard, label: 'Reimbursements', href: '/admin/reimbursements' },
    { icon: Wallet, label: 'Withdrawals', href: '/admin/withdrawals' },
    { icon: Mail, label: 'Contact Messages', href: '/admin/contact-messages' },
    { icon: Bell, label: 'Notifications', href: '/admin/notifications' },
    { icon: BarChart3, label: 'Reports', href: '/admin/reports' },
    { icon: ClipboardCheck, label: 'Audit Trail', href: '/admin/audit' },
    { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signout();
        } catch (error) {
            toast.error("Logout failed. Please try again.");
        }
    };

    return (
        <aside className="fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 hidden md:flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-all duration-300">
            <div className="flex-1 overflow-y-auto py-6">
                <nav className="space-y-1 px-4">
                    <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Admin Menu
                    </div>
                    {ADMIN_NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group relative flex items-center gap-4 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-300",
                                    isActive
                                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-200 translate-x-1"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-teal-600 hover:translate-x-1"
                                )}
                            >
                                <Icon className={cn("size-5 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-teal-600")} />
                                <span>{item.label}</span>
                                {isActive && (
                                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 mx-4 mb-4">
                <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-10 translate-x-10 group-hover:translate-x-5 transition-transform duration-500" />
                    <p className="font-bold relative z-10">Admin Portal</p>
                    <p className="text-xs text-indigo-100 mt-1 relative z-10">Full Access Granted</p>
                </div>
            </div>

            <div className="border-t border-slate-100 p-4">
                <button 
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-red-600 group"
                >
                    <LogOut className="size-5 group-hover:rotate-12 transition-transform duration-300" />
                    Logout
                </button>
            </div>
        </aside>
    );
}
