import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Check, Star } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

interface Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    features: string[];
    is_active: boolean;
    is_featured: boolean;
}

async function getPublicPlans(): Promise<Plan[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('status', 'active')
        .order('price', { ascending: true });

    if (error || !data) {
        return [];
    }
    return data as Plan[];
}

export default async function PlansPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        redirect('/shop/plans')
    }

    const plans = await getPublicPlans()

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
                <section className="py-16 px-4 md:px-6">
                    <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
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
                                        <span className="text-4xl font-bold text-primary">${Number(plan.price || 0).toLocaleString()}</span>
                                        <span className="text-muted-foreground">/year</span>
                                    </div>
                                    <p className="text-muted-foreground mt-2">{plan.description}</p>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {(plan.features || []).map((feature, idx) => (
                                        <li key={idx} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
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
    )
}
