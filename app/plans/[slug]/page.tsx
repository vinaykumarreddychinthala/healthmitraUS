import { Check, Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { parseDescriptionPoints } from "@/lib/utils"

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
        <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4 md:p-8">
            <div className="max-w-6xl w-full mx-auto">
                <div className="grid md:grid-cols-2 gap-12 items-center bg-gradient-to-r from-teal-600 to-cyan-600 rounded-3xl p-8 md:p-12 shadow-2xl text-white">
                    <div>
                        {plan.is_featured && (
                            <div className="inline-flex items-center gap-1 bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                                <Star className="w-4 h-4 fill-current" />
                                POPULAR
                            </div>
                        )}
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            {plan.name}
                        </h1>
                        <div className="text-teal-50 mb-6 space-y-1 text-left max-w-lg">
                            {parseDescriptionPoints(plan.description).map((point, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-lg">
                                    <span className="text-teal-200 select-none mt-1.5 shrink-0">•</span>
                                    <span>{point}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold">${Number(plan.price || 0).toLocaleString()}</span>
                            <span className="text-xl text-teal-100">/ {plan.duration_days ? Math.round(plan.duration_days/30) : 12} Months</span>
                        </div>
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
        </main>
    )
}
