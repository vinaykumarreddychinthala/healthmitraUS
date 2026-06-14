'use client';

import { useState, useEffect } from 'react';
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Check, Star, Shield, Users, Heart, CreditCard, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { parseDescriptionPoints } from "@/lib/utils"

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    allowed_services: string[];
    features: string[];
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

export default function ShopPlansPage() {
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectingPlan, setSelectingPlan] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchPlans = async () => {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('status', 'active')
                .order('price', { ascending: true });

            if (error) {
                console.error('Error fetching plans:', error);
            } else {
                setPlans(data || []);
            }
            setLoading(false);
        };

        fetchPlans();
    }, []);

    const handleSelectPlan = async (planId: string) => {
        setSelectingPlan(planId);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            router.push('/login?redirect=/shop/plans');
            return;
        }

        // Redirect to checkout
        router.push(`/checkout/${planId}`);
    };

    return (
        <>
            <Header />
            <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
                {/* Hero Section */}
                <section className="py-16 px-4 md:px-6 bg-gradient-to-r from-teal-600 to-cyan-600">
                    <div className="max-w-6xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                            Choose Your Health Plan
                        </h1>
                        <p className="text-xl text-teal-100 max-w-2xl mx-auto">
                            Select the perfect plan for you and your family. Get instant coverage and access to quality healthcare.
                        </p>
                    </div>
                </section>

                {/* Plans Grid */}
                <section className="py-12 px-4 md:px-6 -mt-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                                <p className="text-slate-500">Loading plans...</p>
                            </div>
                        </div>
                    ) : plans.length === 0 ? (
                        <div className="max-w-2xl mx-auto text-center py-16">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-10 h-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">No Plans Available</h3>
                            <p className="text-slate-500 mb-6">There are no active plans available at the moment. Please check back later.</p>
                        </div>
                    ) : (
                    <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <Card 
                                key={plan.id}
                                className={`relative overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                                    plan.is_featured 
                                        ? 'border-2 border-teal-500 shadow-xl shadow-teal-100' 
                                        : 'border border-slate-200 hover:border-teal-300'
                                }`}
                            >
                                {plan.is_featured && (
                                    <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                        POPULAR
                                    </div>
                                )}
                                <CardContent className="p-8">
                                    <div className="text-center mb-6">
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                        <div className="text-slate-500 text-sm mt-3 text-left space-y-1 mx-auto max-w-[280px]">
                                            {parseDescriptionPoints(plan.description).map((point, idx) => (
                                                <div key={idx} className="flex items-start gap-2">
                                                    <span className="text-teal-500 select-none mt-1 shrink-0">•</span>
                                                    <span>{point}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4">
                                            <span className="text-4xl font-bold text-slate-900">${Number(plan.price || 0).toLocaleString()}</span>
                                            <span className="text-slate-500">/year</span>
                                        </div>
                                    </div>
                                    
                                    <ul className="space-y-3 mb-8">
                                        {(() => {
                                            const services = (plan.allowed_services || []).map((serviceId) => SYSTEM_SERVICES_MAP[serviceId] || serviceId);
                                            const allFeatures = Array.from(new Set([...services, ...(plan.features || [])]));
                                            return allFeatures.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm">
                                                    <Check className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                                                    <span className="text-slate-600">{feature}</span>
                                                </li>
                                            ));
                                        })()}
                                    </ul>
                                    
                                    <Button 
                                        onClick={() => handleSelectPlan(plan.id)}
                                        disabled={selectingPlan === plan.id}
                                        className={`w-full ${plan.is_featured ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                                    >
                                        {selectingPlan === plan.id ? (
                                            <>Processing...</>
                                        ) : (
                                            <>
                                                Buy Now <ArrowRight className="ml-2 w-4 h-4" />
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    )}
                </section>

                {/* Features Comparison */}
                <section className="py-16 px-4 md:px-6 bg-slate-50">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Why Choose HealthMitra?</h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Shield className="w-8 h-8 text-teal-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Cashless Claims</h3>
                                <p className="text-slate-600 text-sm">Get treated at 1000+ network hospitals without paying cash</p>
                            </div>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Family Coverage</h3>
                                <p className="text-slate-600 text-sm">Cover your entire family under one plan</p>
                            </div>
                            <div className="text-center">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Heart className="w-8 h-8 text-purple-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">24/7 Support</h3>
                                <p className="text-slate-600 text-sm">Access healthcare assistance anytime</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    )
}
