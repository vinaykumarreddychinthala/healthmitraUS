import Link from "next/link";
import { Activity, Heart } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex bg-slate-50 dark:bg-slate-900">
      {/* Left Side - Brand & Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#113a40] overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background Patterns */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center">
            <img src="/logo.jpg" alt="HealthMitra" className="h-14 w-auto" />
          </Link>
        </div>

        {/* Main Content */}
        <div className="relative z-10 space-y-6 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight">
            Your Trusted Partner in <br />
            <span className="text-teal-300">Holistic Healthcare</span>
          </h2>
          <p className="text-teal-100 text-lg leading-relaxed">
            Access preventive care, manage insurance claims, and order medicines
            seamlessly. Join thousands of families securing their future with
            HealthMitra.
          </p>

          <div className="flex gap-4 pt-4">
            {/* <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-[#113a40] bg-slate-200 flex items-center justify-center overflow-hidden"
                >
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 100}`}
                    alt="user"
                    className="w-full h-full bg-white"
                  />
                </div>
              ))}
            </div> */}
            {/* <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1">
                <span className="font-bold">50k+</span>
                <span className="text-teal-300 text-sm">Members</span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className="text-yellow-400 text-xs">
                    ★
                  </span>
                ))}
              </div>
            </div> */}
          </div>
        </div>

        {/* Footer Features */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
            <Activity className="h-6 w-6 text-teal-300 mb-2" />
            <h3 className="font-semibold">Preventive Care</h3>
            <p className="text-xs text-teal-200">Regular checkups & tracking</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
            <Heart className="h-6 w-6 text-pink-300 mb-2" />
            <h3 className="font-semibold">Family Coverage</h3>
            <p className="text-xs text-teal-200">Protect your loved ones</p>
          </div>
        </div>
      </div>

      {/* Right Side - Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-8">{children}</div>

        {/* Mobile Background decoration */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#113a40] to-slate-50 -z-10"></div>
      </div>
    </div>
  );
}
