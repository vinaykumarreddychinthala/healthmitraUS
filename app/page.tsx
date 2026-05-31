import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { parseDescriptionPoints } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  Shield,
  Heart,
  Clock,
  Users,
  Star,
  CheckCircle2,
  Phone,
  Calendar,
  Activity,
  Stethoscope,
  Pill,
  Ambulance,
  FileText,
  Award,
  ArrowUpRight,
  HeartHandshake,
  Siren,
} from "lucide-react";
import Image from "next/image";
import { Testimonials } from "@/components/testimonials";

async function getHomepageData() {
  const supabase = await createClient();

  // Get active plans count
  const { count: plansCount } = await supabase
    .from("plans")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // Get active members count
  const { count: membersCount } = await supabase
    .from("ecard_members")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Get service requests count
  const { count: requestsCount } = await supabase
    .from("service_requests")
    .select("*", { count: "exact", head: true });

  // Get cities count
  const { count: citiesCount } = await supabase
    .from("cities")
    .select("*", { count: "exact", head: true })
    .eq("is_serviceable", true);

  // Get testimonials (from cms_content or use defaults)
  const { data: testimonials } = await supabase
    .from("cms_content")
    .select("key, value")
    .like("key", "testimonial_%")
    .limit(3);

  // Get faqs
  const { data: faqs } = await supabase
    .from("cms_content")
    .select("key, value")
    .like("key", "faq_%")
    .limit(5);

  return {
    plansCount: plansCount || 0,
    membersCount: membersCount || 0,
    requestsCount: requestsCount || 0,
    citiesCount: citiesCount || 0,
    testimonials: testimonials || [],
    faqs: faqs || [],
  };
}

async function getPlans() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true })
    .limit(3);
  return data || [];
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const adminClient = await createAdminClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin") {
      redirect("/admin/dashboard");
    }
    redirect("/dashboard");
  }

  const homepageData = await getHomepageData();
  const plans = await getPlans();

  // Parse testimonials from CMS
  const parsedTestimonials = homepageData.testimonials
    .map((t: any) => {
      try {
        return JSON.parse(t.value);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Parse FAQs from CMS
  const parsedFaqs = homepageData.faqs
    .map((f: any) => {
      try {
        return JSON.parse(f.value);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const stats = [
    {
      number: `${(5638 + homepageData.membersCount / 1000).toFixed(0)}+`,
      label: "Happy Members",
      icon: Users,
    },
    {
      number: `${10 + homepageData.plansCount}+`,
      label: "Health Plans",
      icon: Shield,
    },
    {
      number: `${10 + homepageData.citiesCount}+`,
      label: "Cities Covered",
      icon: MapIcon,
    },
    { number: "24/7", label: "Support Available", icon: Clock },
  ];

  const features = [
    {
      icon: Stethoscope,
      title: "Doctor Consultations",
      desc: "Connect with specialists anytime, anywhere",
    },
    // {
    //   icon: Pill,
    //   title: "Medicine Delivery",
    //   desc: "Get medicines delivered to your doorstep",
    // },
    {
      icon: Ambulance,
      title: "Emergency Services",
      desc: "24/7 ambulance and emergency support",
    },
    {
      icon: FileText,
      title: "Health Records",
      desc: "Secure digital storage for all medical documents",
    },
    {
      icon: Activity,
      title: "Health Monitoring",
      desc: "Regular checkups and health tracking",
    },
    {
      icon: Heart,
      title: "Personalized Care",
      desc: "Tailored care plans for every member",
    },
    {
      icon: HeartHandshake,
      title: "Eldercare Services",
      desc: "Dedicated care and support for the elderly",
    },
    {
      icon: Siren,
      title: "SOS Emergency",
      desc: "Instant access to critical emergency assistance",
    },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 bg-gradient-to-br from-slate-50 via-white to-teal-50 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-teal-500/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full border border-teal-100">
                  <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                  <span className="text-sm font-semibold text-teal-700">
                    Trusted by 50,000+ Families
                  </span>
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1]">
                  Complete <span className="text-teal-600">Healthcare</span> for
                  Your Family
                </h1>

                <p className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl">
                  Comprehensive health plans with doctor consultations, medicine
                  delivery, emergency support, and personalized care for your
                  loved ones.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Link href="/plans">
                    <Button
                      size="lg"
                      className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-200 px-8 h-14 text-base"
                    >
                      View Plans
                      <ArrowRight className="ml-2" size={18} />
                    </Button>
                  </Link>
                  <Link href="/contact">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-slate-300 px-8 h-14 text-base hover:bg-slate-50"
                    >
                      <Phone className="mr-2" size={18} />
                      Talk to Us
                    </Button>
                  </Link>
                </div>

                {/* <div className="flex items-center gap-8 pt-4">
                  <div className="flex -space-x-3">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center">
                        <Users size={16} className="text-slate-500" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((i) => (
                        <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-slate-500">4.9/5 from 10,000+ reviews</p>
                  </div>
                </div> */}
              </div>

              <div className="relative hidden lg:block">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-blue-100 rounded-3xl blur-2xl"></div>
                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                  <Image
                    src="/elderly-person-with-caregiver-smiling-at-home.jpg"
                    alt="Healthcare for family"
                    width={600}
                    height={500}
                    className="w-full h-[500px] object-cover"
                    priority
                  />
                  <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                          <Shield className="text-teal-600" size={24} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            Active Protection
                          </p>
                          <p className="text-sm text-slate-500">
                            All plans covered
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-teal-600">
                          99.9%
                        </p>
                        <p className="text-xs text-slate-500">Uptime</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-4">
                      <Icon className="w-7 h-7 text-teal-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-bold text-white mb-2">
                      {stat.number}
                    </p>
                    <p className="text-slate-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Complete Healthcare Solutions
              </h2>
              <p className="text-lg text-slate-600">
                Everything your family needs for better health, all in one place
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="group p-8 rounded-2xl border border-slate-200 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-100/50 transition-all duration-300"
                  >
                    <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-teal-600 transition-colors">
                      <Icon className="w-7 h-7 text-teal-600 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600">{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Plans Section */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                Choose Your Perfect Plan
              </h2>
              <p className="text-lg text-slate-600">
                Flexible health plans designed for every family's needs
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.length > 0 ? (
                plans.map((plan, idx) => (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden border-2 ${idx === 1 ? "border-teal-500 shadow-xl shadow-teal-100" : "border-slate-200"} hover:border-teal-300 transition-all`}
                  >
                    {idx === 1 && (
                      <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                        POPULAR
                      </div>
                    )}
                    <CardContent className="p-8">
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        {plan.name}
                      </h3>
                      <div className="text-slate-500 mb-6 text-sm text-left space-y-1 mx-auto max-w-[280px]">
                        {parseDescriptionPoints(plan.description || "Comprehensive coverage for your family").map((point, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-teal-500 select-none mt-1 shrink-0">•</span>
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-slate-900">
                          ${Number(plan.price || 0).toLocaleString()}
                        </span>
                        <span className="text-slate-500">/year</span>
                      </div>
                      <ul className="space-y-3 mb-8">
                        {(plan.features || [])
                          .slice(0, 4)
                          .map((feature: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm text-slate-600"
                            >
                              <CheckCircle2 className="w-4 h-4 text-teal-500" />
                              {feature}
                            </li>
                          ))}
                      </ul>
                      <Link href={`/checkout-auth/${plan.id}`} className="block">
                        <Button
                          className={`w-full ${idx === 1 ? "bg-teal-600 hover:bg-teal-700" : "bg-slate-900 hover:bg-slate-800"}`}
                        >
                          Get Started
                          <ArrowUpRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-3 text-center py-12 text-slate-500">
                  No plans available at the moment.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        {/* <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-4xl font-bold text-slate-900 mb-4">
                What Our Members Say
              </h2>
              <p className="text-lg text-slate-600">
                Join thousands of happy families across India
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {parsedTestimonials.length > 0 ? (
                parsedTestimonials.map((testimonial: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 rounded-2xl p-8">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating || 5)].map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className="fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <p className="text-slate-600 mb-6 leading-relaxed">
                      "{testimonial.text || testimonial.a}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                        <Users size={20} className="text-teal-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          {testimonial.name || testimonial.author || "Member"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {testimonial.role || testimonial.location || ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-12 text-slate-500">
                  No testimonials available at the moment.
                </div>
              )}
            </div>
          </div>
        </section> */}
        <Testimonials />

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-r from-teal-600 to-teal-700">
          <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-teal-100 mb-10">
              Protect your family's health with the best healthcare plans in
              India
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/plans">
                <Button
                  size="lg"
                  className="bg-white text-teal-700 hover:bg-slate-100 px-10 h-14 text-base font-semibold"
                >
                  View Plans
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white text-teal-700 hover:bg-white/10 px-10 h-14 text-base"
                >
                  <Calendar className="mr-2" size={18} />
                  Book Consultation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function MapIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
