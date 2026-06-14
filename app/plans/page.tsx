'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Check, Star, Globe, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { parseDescriptionPoints } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features: string[];
    allowed_services: string[];
    is_active: boolean;
    is_featured: boolean;
}

const SYSTEM_SERVICES_MAP: Record<string, string> = {
    'ambulance': 'Ambulance',
    'medical_consultation': 'Doctor Consultation',
    'diagnostic': 'Lab Tests / Diagnostic',
    'caretaker': 'Caretaker',
    'nursing': 'Nursing',
};

type CountryMode = 'us' | 'india';

export default function PlansPage() {
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [countryMode, setCountryMode] = useState<CountryMode>('us');

    useEffect(() => {
        const fetchPlans = async () => {
            const supabase = createClient();

            // Check if user is logged in — redirect to shop/plans
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                router.push('/shop/plans');
                return;
            }

            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('status', 'active')
                .order('price', { ascending: true });

            if (!error && data) setPlans(data as Plan[]);
            setLoading(false);
        };
        fetchPlans();
    }, [router]);

    const isIndia = countryMode === 'india';
    const currency = isIndia ? '₹' : '$';

    return (
        <>
            <Header />
            <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
                {/* Hero Section */}
                <section className="py-20 px-4 md:px-6">
                    <div className="max-w-6xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                            Choose Your <span className="text-primary">Health Plan</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                            Affordable health plans designed to give you and your family the protection you deserve.
                        </p>
                    </div>
                </section>



                {/* Plans Grid */}
                <section className="py-8 px-4 md:px-6">
                    <div className="max-w-6xl mx-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-3 gap-8">
                                {plans.map((plan) => (
                                    <div
                                        key={plan.id}
                                        className={`relative p-8 rounded-2xl border-2 transition-all duration-300 ${plan.is_featured
                                            ? 'border-primary bg-gradient-to-b from-primary/5 to-primary/10 shadow-xl scale-105'
                                            : 'border-border bg-card hover:border-primary/50 hover:shadow-lg'
                                        }`}
                                    >
                                        {plan.is_featured && (
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                                <div className="flex items-center gap-1 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                                                    <Star className="w-4 h-4 fill-current" />
                                                    Most Popular
                                                </div>
                                            </div>
                                        )}
                                        <div className="text-center mb-6">
                                            <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                                            <div className="flex items-baseline justify-center gap-1">
                                                <span className="text-4xl font-bold text-primary">
                                                    {currency}{Number(plan.price || 0).toLocaleString()}
                                                </span>
                                                <span className="text-muted-foreground">/year</span>
                                            </div>
                                            {isIndia && (
                                                <p className="text-xs text-amber-600 mt-1">+ 18% GST at checkout</p>
                                            )}
                                            <div className="text-muted-foreground text-sm mt-3 text-left space-y-1 mx-auto max-w-[280px]">
                                                {parseDescriptionPoints(plan.description).map((point, idx) => (
                                                    <div key={idx} className="flex items-start gap-2">
                                                        <span className="text-primary select-none mt-1 shrink-0">•</span>
                                                        <span>{point}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <ul className="space-y-3 mb-8">
                                            {(() => {
                                                const services = (plan.allowed_services || []).map(s => SYSTEM_SERVICES_MAP[s] || s);
                                                const allFeatures = Array.from(new Set([...services, ...(plan.features || [])]));
                                                return allFeatures.map((feature, idx) => (
                                                    <li key={idx} className="flex items-start gap-3">
                                                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                                        <span className="text-muted-foreground">{feature}</span>
                                                    </li>
                                                ));
                                            })()}
                                        </ul>
                                        <Link href={`/checkout-auth/${plan.id}`} className="block">
                                            <Button
                                                className={`w-full ${plan.is_featured ? 'bg-primary hover:bg-primary/90' : ''}`}
                                                variant={plan.is_featured ? 'default' : 'outline'}
                                            >
                                                Get Started
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* FAQ Preview */}
                <section className="py-16 px-4 md:px-6 bg-card">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold mb-4">Have Questions?</h2>
                        <p className="text-muted-foreground mb-8">
                            Check out our FAQ section or contact our team for personalized assistance.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link href="/faq">
                                <Button variant="outline" size="lg">View FAQ</Button>
                            </Link>
                            <Link href="/contact">
                                <Button size="lg" className="bg-primary hover:bg-primary/90">Contact Sales</Button>
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Guarantee */}
                <section className="py-16 px-4 md:px-6">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-600 px-4 py-2 rounded-full mb-4">
                            <Check className="w-5 h-5" />
                            <span className="font-medium">30-Day Money Back Guarantee</span>
                        </div>
                        <p className="text-muted-foreground">
                            Not satisfied? Get a full refund within 30 days, no questions asked.
                        </p>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
