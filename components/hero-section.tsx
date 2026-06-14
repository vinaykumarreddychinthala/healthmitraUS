import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Image from "next/image"

export function HeroSection() {
  return (
    <section className="relative pt-20 md:pt-32 pb-20 md:pb-40 bg-gradient-to-br from-blue-50 via-white to-teal-50 overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="flex flex-col gap-8">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl lg:text-6xl font-bold text-balance text-primary leading-tight tracking-tight">
                Premium Healthcare for Your Loved Ones
              </h1>
              <p className="text-lg md:text-xl text-black font-semibold leading-relaxed max-w-xl">
                HealthMitra provides comprehensive, compassionate senior care coordination. From medical support to wellness programs, we're here for every moment that matters.
              </p>
            </div>

            {/* Quick Benefits */}
            <div className="space-y-3 pt-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="text-secondary" size={20} />
                </div>
                <span className="text-base text-foreground font-medium">24/7 Medical Support & Emergency Response</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="text-secondary" size={20} />
                </div>
                <span className="text-base text-foreground font-medium">Regular Health Monitoring & Hospital Accompaniment</span>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle2 className="text-secondary" size={20} />
                </div>
                <span className="text-base text-foreground font-medium">Lively Activities & Social Engagement</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all">
                  Explore Plans
                  <ArrowRight className="ml-2" size={18} />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  className="w-full sm:w-auto border-2 border-primary/20 text-primary hover:bg-primary/5 bg-white transition-all"
                >
                  Schedule a Consultation
                </Button>
              </Link>
            </div>
          </div>

          {/* Image with premium styling */}
          <div className="relative h-96 md:h-[550px] lg:h-[600px] group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-primary/10 rounded-3xl blur-2xl group-hover:blur-3xl transition-all duration-500"></div>
            <Image
              src="/elderly-person-with-caregiver-smiling-at-home.jpg"
              alt="Elderly person with caregiver"
              fill
              className="object-cover rounded-3xl shadow-2xl group-hover:shadow-xl transition-all duration-500 border border-white/50"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
