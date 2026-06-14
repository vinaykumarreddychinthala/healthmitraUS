import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import {
  Stethoscope,
  Pill,
  Ambulance,
  TestTube,
  Heart,
  Shield,
  Clock,
  CreditCard,
  HeartHandshake,
  Siren,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Stethoscope,
    title: "Doctor Consultations",
    description:
      "Access to qualified doctors for in-person and teleconsultation services. Book appointments with specialists across various medical fields.",
    features: [
      "General Physicians",
      "Specialists",
      "Teleconsultation",
      "Home Visits",
    ],
  },
  // {
  //     icon: Pill,
  //     title: "Medicine Delivery",
  //     description: "Order prescribed medicines online and get them delivered to your doorstep. Enjoy discounts on a wide range of medications.",
  //     features: ["Home Delivery", "Up to 25% Off", "Prescription Upload", "Auto-refill"]
  // },
  {
    icon: TestTube,
    title: "Diagnostic Tests",
    description:
      "Book lab tests and health checkups with home sample collection. Get accurate reports from certified laboratories.",
    features: [
      "Home Collection",
      "Quick Reports",
      "Certified Labs",
      "Health Packages",
    ],
  },
  {
    icon: Ambulance,
    title: "Ambulance Services",
    description:
      "24/7 emergency ambulance services with trained medical staff. GPS-enabled tracking for quick response times.",
    features: [
      "24/7 Availability",
      "GPS Tracking",
      "Trained Staff",
      "ICU Equipped",
    ],
  },
  {
    icon: Heart,
    title: "Health Plans",
    description:
      "Comprehensive health plans for individuals and families. Cover hospitalization, OPD, and wellness benefits.",
    features: [
      "Cashless Claims",
      "Family Coverage",
      "OPD Benefits",
      "Wellness Rewards",
    ],
  },
  {
    icon: Shield,
    title: "Insurance Claims",
    description:
      "Hassle-free insurance claim processing and reimbursement support. Track your claims in real-time.",
    features: [
      "Quick Processing",
      "Real-time Tracking",
      "Document Upload",
      "Expert Support",
    ],
  },
  {
    icon: HeartHandshake,
    title: "Eldercare Services",
    description:
      "Dedicated care and assistance programs designed for the well-being and comfort of the elderly.",
    features: [
      "Home Attendants",
      "Routine Checkups",
      "Medication Assistance",
      "Companionship",
    ],
  },
  {
    icon: Siren,
    title: "SOS Emergency",
    description:
      "Instant emergency response system for critical medical situations and immediate assistance.",
    features: [
      "24/7 Response",
      "Immediate Dispatch",
      "Priority Admission",
      "Family Alerts",
    ],
  },
  {
    icon: Receipt,
    title: "Bill Reimbursements",
    description:
      "Submit and track your medical bills for quick and easy reimbursements. Get your money back directly to your bank account.",
    features: [
      "Quick Processing",
      "Easy Uploads",
      "Real-time Tracking",
      "Direct Bank Transfer",
    ],
  },
];

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Hero Section */}
        <section className="py-20 px-4 md:px-6">
          <div className="max-w-6xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Our <span className="text-primary">Services</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Comprehensive healthcare services designed to meet all your
              medical needs under one platform.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 px-4 md:px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-muted-foreground mb-4">
                  {service.description}
                </p>
                <ul className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-16 px-4 md:px-6 bg-card">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Choose HealthMitra?
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center p-6">
                <Clock className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">24/7 Support</h3>
                <p className="text-sm text-muted-foreground">
                  Round-the-clock assistance for all your healthcare needs
                </p>
              </div>
              <div className="text-center p-6">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Trusted Network</h3>
                <p className="text-sm text-muted-foreground">
                  500+ verified hospitals and diagnostic centers
                </p>
              </div>
              <div className="text-center p-6">
                <CreditCard className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Cashless Services</h3>
                <p className="text-sm text-muted-foreground">
                  Hassle-free cashless treatment at network hospitals
                </p>
              </div>
              <div className="text-center p-6">
                <Heart className="w-10 h-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Personalized Care</h3>
                <p className="text-sm text-muted-foreground">
                  Customized health solutions for you and your family
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8">
              Join thousands of families who trust HealthMitra for their
              healthcare needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Create Account
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Contact Us
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
