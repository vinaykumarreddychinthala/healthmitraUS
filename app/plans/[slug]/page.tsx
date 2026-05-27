import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Check, Star, ArrowLeft, Shield, Users, Heart } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"

const SYSTEM_SERVICES_MAP: Record<string, string> = {
    'ambulance': 'Ambulance',
    'medical_consultation': 'Doctor Consultation',
    'diagnostic': 'Lab Tests / Diagnostic',
    'caretaker': 'Caretaker',
    'nursing': 'Nursing',
};

async function getPlanBySlug(slug: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

    if (error || !data) {
        return null;
    }
    return data;
}

export default async function PlanDetailsPage(props: { params: Promise<{ slug: string }> }) {
    const params = await props.params;
    const slug = params.slug;
    
    const plan = await getPlanBySlug(slug);

    if (!plan) {
        notFound();
    }

    // Determine features either from allowed_services or features
    const services = (plan.allowed_services || []).map((s: string) => SYSTEM_SERVICES_MAP[s] || s);
    const additionalFeatures = plan.features || [];
    const allFeatures = Array.from(new Set([...services, ...additionalFeatures]));

    return (
        <>
            <Header />
            <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
                {/* Hero Section */}
                <section className="py-16 px-4 md:px-6 bg-gradient-to-r from-teal-600 to-cyan-600">
                    <div className="max-w-6xl mx-auto">
                        <Link href="/shop/plans" className="inline-flex items-center text-teal-100 hover:text-white mb-8 transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to plans
                        </Link>
                        
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="text-white">
                                {plan.is_featured && (
                                    <div className="inline-flex items-center gap-1 bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                                        <Star className="w-4 h-4 fill-current" />
                                        POPULAR
                                    </div>
                                )}
                                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                                    {plan.name}
                                </h1>
                                <p className="text-xl text-teal-50 mb-6">
                                    {plan.description}
                                </p>
                                
                                <div className="flex items-baseline gap-2 mb-8">
                                    <span className="text-5xl font-bold">${Number(plan.price || 0).toLocaleString()}</span>
                                    <span className="text-xl text-teal-100">/ {plan.duration_days ? Math.round(plan.duration_days/30) : 12} Months</span>
                                </div>
                                
                                <Link href={`/checkout/${plan.id}`} className="block sm:inline-block">
                                    <Button size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-lg px-8 py-6 rounded-xl shadow-xl shadow-slate-900/20">
                                        Buy Now
                                    </Button>
                                </Link>
                            </div>
                            
                            <div className="bg-white rounded-2xl p-8 shadow-2xl text-slate-900 border border-slate-100">
                                <h3 className="text-2xl font-bold mb-6">What's Included</h3>
                                <ul className="space-y-4">
                                    {allFeatures.length > 0 ? allFeatures.map((feature: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <div className="bg-teal-100 p-1 rounded-full shrink-0 mt-0.5">
                                                <Check className="w-4 h-4 text-teal-600" />
                                            </div>
                                            <span className="text-slate-700 font-medium">{feature}</span>
                                        </li>
                                    )) : (
                                        <li className="text-slate-500">No features listed.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
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
