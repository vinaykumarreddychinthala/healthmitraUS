'use client';

import Link from "next/link";
import { Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function Footer() {
    const supabase = createClient();
    const [settings, setSettings] = useState<Record<string, string>>({});

    useEffect(() => {
        const loadSettings = async () => {
            const { data } = await supabase.from('system_settings').select('key, value');
            if (data) {
                const settingsObj: Record<string, string> = {};
                data.forEach((s: any) => {
                    settingsObj[s.key] = s.value;
                });
                setSettings(settingsObj);
            }
        };
        loadSettings();
    }, []);

    const getSetting = (key: string, fallback: string) => settings[key] || fallback;

    return (
        <footer className="bg-gradient-to-b from-white to-blue-50/30 border-t border-border/50">
            <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 font-bold text-lg text-primary">
                            <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                                H
                            </div>
                            <span>{getSetting('company_name', 'HealthMitra')}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {getSetting('company_tagline', 'Comprehensive healthcare coordination and facilitation platform.')}
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="flex flex-col gap-3">
                        <h3 className="font-semibold text-foreground">Quick Links</h3>
                        <Link href="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            About Us
                        </Link>
                        <Link href="/services" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Services
                        </Link>
                        <Link href="/plans" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Membership Plans
                        </Link>
                        <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Blog
                        </Link>
                        <Link href="/partner-application" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Become a Partner
                        </Link>
                    </div>

                    {/* Support */}
                    <div className="flex flex-col gap-3">
                        <h3 className="font-semibold text-foreground">Support</h3>
                        <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Contact Us
                        </Link>
                        <Link href="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            FAQ
                        </Link>
                        <Link href="/refund-cancellation" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Refund Policy
                        </Link>
                        <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/disclaimers" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Disclaimers
                        </Link>
                    </div>

                    {/* Contact Info */}
                    <div className="flex flex-col gap-4">
                        <div>
                            <h3 className="font-semibold text-foreground mb-3">USA Office</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Phone size={16} />
                                <span>{getSetting('usa_phone', '716-579-0346')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                                <span>{getSetting('usa_address', '1550 Sheridan Drive, Buffalo, NY 14217')}</span>
                            </div>
                        </div>
                        <div className="border-t border-border pt-4">
                            <h3 className="font-semibold text-foreground mb-3">India Office</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                <Phone size={16} />
                                <span>{getSetting('india_phone', '+91 9818823106')}</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                                <span className="text-xs">
                                {getSetting('india_address', 'HealthMitra Systems Pvt Ltd, C/O JSS Academy of Technical Education, C-20/1, Sector 62, Noida, Uttar Pradesh 201309')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social Links & Copyright */}
                <div className="border-t border-border pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {getSetting('company_name', 'HealthMitra')}. All rights reserved.</p>
                    <div className="flex gap-4">
                        {getSetting('facebook_url', '') && (
                            <a href={getSetting('facebook_url', '#')} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Facebook size={20} />
                            </a>
                        )}
                        {getSetting('twitter_url', '') && (
                            <a href={getSetting('twitter_url', '#')} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Twitter size={20} />
                            </a>
                        )}
                        {getSetting('linkedin_url', '') && (
                            <a href={getSetting('linkedin_url', '#')} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Linkedin size={20} />
                            </a>
                        )}
                        {getSetting('instagram_url', '') && (
                            <a href={getSetting('instagram_url', '#')} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Instagram size={20} />
                            </a>
                        )}
                        {getSetting('youtube_url', '') && (
                            <a href={getSetting('youtube_url', '#')} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                                <Youtube size={20} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
}
