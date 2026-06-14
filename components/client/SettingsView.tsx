'use client';

import React, { useState, useEffect } from 'react';
import { User, Bell, Lock, LogOut, ChevronRight, Key, CreditCard, FileText, Heart } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SettingsView() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data);
            }
            setLoading(false);
        };
        loadProfile();
    }, []);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const settingsSections = [
        {
            title: "Account",
            items: [
                { icon: User, label: "Profile Settings", description: "Name, email, phone, avatar", href: "/profile" },
                { icon: Lock, label: "Change Password", description: "Update your password", href: "/profile?tab=security" },
                // { icon: Key, label: "Two-Factor Authentication", description: "Extra security layer", href: "/profile?tab=security" },
            ]
        },
        /*
        {
            title: "Notifications",
            items: [
                { icon: Bell, label: "Notification Preferences", description: "Email, SMS, push notifications", href: "/profile?tab=preferences" },
                { icon: FileText, label: "Activity Logs", description: "View login history", href: "/profile?tab=security" },
            ]
        },
        */
        {
            title: "Billing",
            items: [
                // { icon: CreditCard, label: "Payment Methods", description: "Cards, UPI, wallets", href: "/wallet" },
                { icon: FileText, label: "Invoices & Bills", description: "View payment history", href: "/invoices" },
            ]
        },
        {
            title: "Health",
            items: [
                { icon: Heart, label: "Medical Information", description: "Blood type, allergies, conditions", href: "/profile?tab=personal" },
                { icon: User, label: "Emergency Contacts", description: "Add emergency contacts", href: "/profile?tab=personal" },
            ]
        }
    ];

    const getIconBg = (icon: any) => {
        if (icon === User) return 'bg-blue-50 text-blue-600';
        if (icon === Bell) return 'bg-amber-50 text-amber-600';
        if (icon === Lock) return 'bg-indigo-50 text-indigo-600';
        if (icon === CreditCard) return 'bg-emerald-50 text-emerald-600';
        if (icon === Heart) return 'bg-rose-50 text-rose-600';
        return 'bg-slate-100 text-slate-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
                <p className="text-slate-500 text-sm">Manage your account preferences</p>
            </div>

            {/* Profile Summary */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                        {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{profile?.full_name || 'User'}</h2>
                        <p className="text-teal-100">{profile?.email}</p>
                        <p className="text-teal-100 text-sm">{profile?.phone || 'No phone added'}</p>
                    </div>
                </div>
            </div>

            {/* Settings Sections */}
            {settingsSections.map((section, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                        <h3 className="font-semibold text-slate-700">{section.title}</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {section.items.map((item, itemIdx) => (
                            <Link key={itemIdx} href={item.href} className="block">
                                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${getIconBg(item.icon)}`}>
                                            <item.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-700">{item.label}</p>
                                            <p className="text-xs text-slate-500">{item.description}</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-400" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ))}

            {/* Sign Out */}
            <button onClick={handleSignOut} className="w-full bg-white rounded-2xl border border-red-200 p-4 flex items-center justify-between hover:bg-red-50 transition-colors group">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-100">
                        <LogOut size={20} />
                    </div>
                    <div>
                        <p className="font-medium text-red-600">Sign Out</p>
                        <p className="text-xs text-red-400">Log out of your account</p>
                    </div>
                </div>
                <ChevronRight size={18} className="text-red-400" />
            </button>

            {/* App Info */}
            <div className="text-center text-sm text-slate-400">
                <p>HealthMitra v1.0.0</p>
                <p>© 2026 HealthMitra. All rights reserved.</p>
            </div>
        </div>
    );
}
