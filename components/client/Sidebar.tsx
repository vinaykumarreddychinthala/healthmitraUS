"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    Stethoscope,
    ShoppingBag,
    CreditCard,
    Receipt,
    Wallet,
    Folder,
    User,
    HelpCircle,
    LogOut,
    FileText,
    FolderHeart,
    Settings,
    Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signout } from "@/app/actions/auth";
import { toast } from "sonner";

export interface NavItem {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    href: string;
    badge?: number;
}

export const NAV_ITEMS: NavItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: FileText, label: 'Service Requests', href: '/service-requests' },
    { icon: ShoppingBag, label: 'My Purchases', href: '/my-purchases' },
    { icon: Wallet, label: 'My Wallet', href: '/wallet' },
    { icon: Receipt, label: 'Invoices', href: '/invoices' },
    { icon: Folder, label: 'Reimbursements', href: '/reimbursements' },
    { icon: FolderHeart, label: 'Health Records', href: '/phr' },
    { icon: CreditCard, label: 'E-Cards', href: '/e-cards' },
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: HelpCircle, label: 'Support', href: '/support' }
];

export function Sidebar() {
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
                <nav className="space-y-2 px-4">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group relative flex items-center gap-4 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-300",
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
