"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
    Bell,
    Menu,
    User,
    Settings,
    HelpCircle,
    LogOut,
    Stethoscope,
    Check,
    X,
    ExternalLink
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NavItem } from "./Sidebar";
import { createClient } from "@/lib/supabase/client";


interface DashboardHeaderProps {
    user?: {
        id?: string;
        name: string;
        email: string;
        avatar?: string;
    } | null;
}

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    action_url: string | null;
    created_at: string;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loadingNotifications, setLoadingNotifications] = useState(false);

    const userName = user?.name || "User";
    const userEmail = user?.email || "";
    const userInitials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const loadNotifications = useCallback(async () => {
        if (!user?.id && !user?.email) return;
        
        setLoadingNotifications(true);
        
        // Get user ID - use user.id if available, otherwise query by email
        let userId = user?.id;
        
        if (!userId && user?.email) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', user.email)
                .single();
            userId = profile?.id;
        }

        if (userId) {
            // Fetch notifications using user ID
            const { data: notifs } = await supabase
                .from('notifications')
                .select('*')
                .eq('recipient_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (notifs) {
                setNotifications(notifs);
                setUnreadCount(notifs.filter(n => !n.is_read).length);
            }
        }
        
        setLoadingNotifications(false);
    }, [user, supabase]);

    useEffect(() => {
        if (user) {
            loadNotifications();
        }
    }, [user, loadNotifications]);

    const markAsRead = async (notificationId: string) => {
        let userId = user?.id;
        
        if (!userId && user?.email) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', user.email)
                .single();
            userId = profile?.id;
        }

        if (!userId) return;

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('recipient_id', userId);

        setNotifications(prev => 
            prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsRead = async () => {
        let userId = user?.id;
        
        if (!userId && user?.email) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', user.email)
                .single();
            userId = profile?.id;
        }

        if (!userId) return;

        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('recipient_id', userId)
            .eq('is_read', false);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-lg md:px-6">
            <div className="flex items-center gap-4">
                {/* Mobile Menu */}
                <Sheet>
                    <SheetTrigger suppressHydrationWarning className="md:hidden inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 w-9">
                        <Menu className="size-6 text-slate-700" />
                        <span className="sr-only">Toggle menu</span>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <SheetHeader className="border-b border-slate-200 p-4">
                            <SheetTitle className="flex items-center gap-2 text-primary">
                                <Stethoscope className="size-6" />
                                <span>Healthmitra</span>
                            </SheetTitle>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto py-4">
                            <nav className="space-y-1 px-2">
                                {NAV_ITEMS.map((item: NavItem) => {
                                    const isActive = pathname === item.href;
                                    const Icon = item.icon;
                                    return (
                                        <SheetClose asChild key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    "relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 mx-2",
                                                    isActive
                                                        ? "bg-teal-50 text-teal-700 border-l-4 border-teal-600"
                                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                )}
                                            >
                                                <Icon className={cn("size-5", isActive ? "text-teal-600" : "text-slate-500")} />
                                                {item.label}
                                                {'badge' in item && item.badge && (
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </SheetClose>
                                    );
                                })}
                            </nav>
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Logo */}
                <Link href="/dashboard" className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-semibold text-slate-800">
                            Health<span className="text-teal-600">mitra</span>
                        </h1>
                    </div>
                    <span className="hidden text-xs text-slate-500 md:block">
                        Your Health, Our Priority
                    </span>
                </Link>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                {/* Welcome Message */}
                <div className="hidden text-right md:block">
                    <p className="text-sm font-medium text-slate-700">
                        Welcome back, <span className="text-teal-700">{userName}!</span>
                    </p>
                </div>

                {/* Notifications */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button suppressHydrationWarning variant="ghost" size="icon" className="relative text-slate-600 hover:bg-slate-100">
                            <Bell className="size-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white ring-2 ring-white">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <div className="flex items-center justify-between px-3 py-2 border-b">
                            <span className="font-semibold">Notifications</span>
                            {unreadCount > 0 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 text-xs text-teal-600 hover:text-teal-700"
                                    onClick={markAllAsRead}
                                >
                                    Mark all read
                                </Button>
                            )}
                        </div>
                        <ScrollArea className="h-[300px]">
                            {loadingNotifications ? (
                                <div className="flex items-center justify-center p-4">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-slate-500">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <DropdownMenuItem 
                                        key={notif.id} 
                                        className={cn(
                                            "flex flex-col items-start gap-1 p-3 cursor-pointer",
                                            !notif.is_read && "bg-teal-50"
                                        )}
                                        onClick={() => !notif.is_read && markAsRead(notif.id)}
                                    >
                                        <div className="flex items-start justify-between w-full gap-2">
                                            <span className={cn("font-medium text-sm", !notif.is_read && "text-teal-700")}>
                                                {notif.title}
                                            </span>
                                            <span className="text-xs text-slate-400 shrink-0">
                                                {formatTime(notif.created_at)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-600 line-clamp-2">
                                            {notif.message}
                                        </span>
                                        {notif.action_url && (
                                            <span className="text-xs text-teal-600 flex items-center gap-1">
                                                <ExternalLink className="h-3 w-3" /> View Details
                                            </span>
                                        )}
                                    </DropdownMenuItem>
                                ))
                            )}
                        </ScrollArea>
                        <div className="border-t p-2">
                            <Link 
                                href="/notifications" 
                                className="flex w-full items-center justify-center p-2 text-sm text-teal-600 hover:text-teal-700"
                            >
                                View all notifications
                            </Link>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button suppressHydrationWarning variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9 border border-slate-200">
                                <AvatarImage src={user?.avatar} alt={userName} />
                                <AvatarFallback className="bg-teal-50 text-teal-700">{userInitials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {userEmail}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/profile">
                            <DropdownMenuItem>
                                <User className="mr-2 h-4 w-4" />
                                Profile
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                            <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/support">
                            <DropdownMenuItem>
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Help & Support
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
