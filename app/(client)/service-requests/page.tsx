
"use client";

import { useState, useEffect } from "react";
import {
  TestTube,
  Pill,
  Ambulance,
  Stethoscope,
  UserPlus,
  Activity,
  Search,
  Gift,
  MessageSquare,
  AlertTriangle,
  User,
  Heart,
  Receipt,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/client/services/ServiceCard";
import Link from "next/link";
import {
  ServiceRequestFilters,
  FilterState,
} from "@/components/client/requests/ServiceRequestFilters";
import { LatestRequestPopup } from "@/components/client/requests/LatestRequestPopup";
import KYCGateBanner from "@/components/client/KYCGateBanner";
import { useKYCStatus } from "@/hooks/useKYCStatus";

// SERVICE TYPES
const SERVICES = [
  {
    id: "diagnostic",
    title: "Diagnostic Tests",
    description:
      "Book blood tests, full body checkups, and radiology services at home or center.",
    icon: TestTube,
    colorClass: "text-purple-600 bg-purple-50",
    link: "/service-requests/new?type=diagnostic",
  },
  // {
  //     id: 'medicine',
  //     title: 'Order Medicines',
  //     description: 'Upload prescription and get medicines delivered to your doorstep.',
  //     icon: Pill,
  //     colorClass: 'text-emerald-600 bg-emerald-50',
  //     link: '/service-requests/new?type=medicine'
  // },
  {
    id: "ambulance",
    title: "Ambulance",
    description:
      "Book emergency or non-emergency ambulance services instantly.",
    icon: Ambulance,
    colorClass: "text-red-600 bg-red-50",
    link: "/service-requests/new?type=ambulance",
  },
  {
    id: "doctor",
    title: "Doctor Appointment",
    description:
      "Consult with top specialists online or visit a nearby clinic.",
    icon: Stethoscope,
    colorClass: "text-blue-600 bg-blue-50",
    link: "/service-requests/new?type=medical_consultation",
  },
  {
    id: "caretaker",
    title: "Caretaker Services",
    description:
      "Professional nursing and caretaker support for home recovery.",
    icon: UserPlus,
    colorClass: "text-orange-600 bg-orange-50",
    link: "/service-requests/new?type=caretaker",
  },
  {
    id: "nursing",
    title: "Nursing Procedures",
    description:
      "Injection, wound dressing, and other nursing procedures at home.",
    icon: Activity,
    colorClass: "text-cyan-600 bg-cyan-50",
    link: "/service-requests/new?type=nursing",
  },
  {
    id: "voucher",
    title: "Redeem Voucher",
    description:
      "Redeem your available vouchers for services, medicines, or tests.",
    icon: Gift,
    colorClass: "text-pink-600 bg-pink-50",
    link: "/service-requests/new?type=voucher",
  },
  {
    id: "companion",
    title: "Companion Services",
    description:
      "Book a trained companion for hospital visits, travel, or daily support.",
    icon: Heart,
    colorClass: "text-rose-600 bg-rose-50",
    link: "/service-requests/new?type=companion",
  },
  {
    id: "bill_reimbursement",
    title: "Bill Reimbursement",
    description:
      "Submit hospital or medical bills for reimbursement review and approval.",
    icon: Receipt,
    colorClass: "text-emerald-600 bg-emerald-50",
    link: "/service-requests/new?type=bill_reimbursement",
  },
  {
    id: "general",
    title: "General Request",
    description: "Submit any general inquiry or request to our support team.",
    icon: MessageSquare,
    colorClass: "text-slate-600 bg-slate-50",
    link: "/service-requests/new?type=general",
  },
  {
    id: "emergency",
    title: "Emergency Service",
    description: "24x7 emergency support for critical health situations.",
    icon: AlertTriangle,
    colorClass: "text-rose-600 bg-rose-50",
    link: "/service-requests/new?type=emergency",
  },
];

// Re-adding Badges as they were removed in previous step (oops)
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    completed: "bg-blue-100 text-blue-700 border-blue-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    cleared: "bg-purple-100 text-purple-700 border-purple-200",
    bill_rejected: "bg-rose-100 text-rose-700 border-rose-200",
    in_progress: "bg-indigo-100 text-indigo-700 border-indigo-200",
    under_review: "bg-cyan-100 text-cyan-700 border-cyan-200",
    cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase border ${colors[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function MemberBadge({ member }: { member: string }) {
  if (!member) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">
      <User className="h-3 w-3" />
      {member.charAt(0).toUpperCase() + member.slice(1)}
    </span>
  );
}

const DEFAULT_FILTERS: FilterState = {
  search: "",
  type: "all",
  status: "all",
  member: "all",
  dateRange: "all",
};
import { getServiceRequests } from "@/app/actions/service-requests";
import { toast } from "sonner";

// ... existing imports ...

// Keep SERVICES array as is (it's static config)

export default function ServiceRequestsPage() {
  const [activeTab, setActiveTab] = useState("book");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showPopup, setShowPopup] = useState(false);
  const [dismissedUpdates, setDismissedUpdates] = useState<string[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { kycSubmitted, checking } = useKYCStatus();

  useEffect(() => {
    const load = async () => {
      const res = await getServiceRequests();
      if (res.success && res.data) {
        setRequests(res.data);
      } else {
        console.error(res.error);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Get new updates for popup
  const newUpdates = requests
    .filter(
      (req) => req.status !== "pending" && !dismissedUpdates.includes(req.id),
    )
    .map((req) => ({
      id: req.id,
      title: req.type || "Service Request",
      requestId: req.id,
      previousStatus: "",
      newStatus: req.status,
      updatedAt: req.updated_at || req.created_at,
      adminComment: req.admin_notes,
    }));

  // Show popup when landing on page and there are new updates
  useEffect(() => {
    if (newUpdates.length > 0 && activeTab === "requests") {
      const hasShownPopup = sessionStorage.getItem("shownRequestPopup");
      if (!hasShownPopup) {
        setShowPopup(true);
        sessionStorage.setItem("shownRequestPopup", "true");
      }
    }
  }, [activeTab, newUpdates.length]);

  // Apply filters
  const filteredRequests = requests.filter((req) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchSearch =
        req.id.toLowerCase().includes(searchLower) ||
        (req.type && req.type.toLowerCase().includes(searchLower)) ||
        (req.description &&
          req.description.toLowerCase().includes(searchLower));
      if (!matchSearch) return false;
    }

    // Type filter
    if (filters.type !== "all" && req.type !== filters.type) return false;

    // Status filter
    if (filters.status !== "all" && req.status !== filters.status) return false;

    // Member filter — check details.memberId or details.policy_holder_relation
    if (filters.member !== "all") {
      const memberVal = filters.member.toLowerCase();
      const memberId = (req.details?.memberId || req.details?.policy_holder_relation || "").toLowerCase();
      const policyHolderRelation = (req.details?.policy_holder_relation || "").toLowerCase();
      // Match against memberId or relation
      const matches = memberId.includes(memberVal) || policyHolderRelation.includes(memberVal);
      if (!matches) return false;
    }

    // Date filter
    if (filters.dateRange !== "all") {
      const reqDate = new Date(req.created_at);
      const now = new Date();

      switch (filters.dateRange) {
        case "today":
          if (reqDate.toDateString() !== now.toDateString()) return false;
          break;
        case "7days":
          if (now.getTime() - reqDate.getTime() > 7 * 24 * 60 * 60 * 1000)
            return false;
          break;
        case "30days":
          if (now.getTime() - reqDate.getTime() > 30 * 24 * 60 * 60 * 1000)
            return false;
          break;
        case "3months":
          if (now.getTime() - reqDate.getTime() > 90 * 24 * 60 * 60 * 1000)
            return false;
          break;
        case "custom":
          if (filters.customStart && reqDate < new Date(filters.customStart))
            return false;
          if (filters.customEnd) {
            const endDate = new Date(filters.customEnd);
            endDate.setHours(23, 59, 59, 999);
            if (reqDate > endDate) return false;
          }
          break;
      }
    }

    return true;
  });

  // ... rest of filtering ...

  const filteredServices = filters.search
    ? SERVICES.filter(
        (s) =>
          s.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          s.description.toLowerCase().includes(filters.search.toLowerCase()),
      )
    : SERVICES;

  const handleDismissUpdates = (ids: string[]) => {
    setDismissedUpdates((prev) => [...prev, ...ids]);
  };

  return (
    <div className="container mx-auto max-w-7xl animate-in fade-in-50 duration-500">
      {/* KYC Gate Banner */}
      {!checking && kycSubmitted === false && (
        <div className="mb-6">
          <KYCGateBanner context="service" />
        </div>
      )}
      {/* Latest Request Popup */}
      {showPopup && newUpdates.length > 0 && (
        <LatestRequestPopup
          updates={newUpdates}
          onClose={() => setShowPopup(false)}
          onDismiss={handleDismissUpdates}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Service Requests
          </h1>
          <p className="text-slate-500">
            Book healthcare services and track your requests
          </p>
        </div>

        {/* New Updates Badge */}
        {newUpdates.length > 0 && (
          <button
            onClick={() => setShowPopup(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl font-medium text-sm shadow-lg shadow-teal-200 hover:shadow-xl transition-all animate-pulse"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            {newUpdates.length} New Update{newUpdates.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Tabs: Book Services / My Requests */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger
            value="book"
            className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Book Services
          </TabsTrigger>
          <TabsTrigger
            value="requests"
            className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm relative"
          >
            My Requests ({requests.length})
            {newUpdates.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {newUpdates.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Book Services */}
        <TabsContent value="book" className="space-y-6">
          {/* Simple Search for Book Tab */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              placeholder="Search services..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => (
              <ServiceCard key={service.id} {...service} link={service.link} />
            ))}
          </div>
        </TabsContent>

        {/* Tab 2: My Requests */}
        <TabsContent value="requests" className="space-y-4">
          {/* Advanced Filters */}
          <ServiceRequestFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
          />

          {/* Results Count */}
          <div className="text-sm text-slate-500 mb-4">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-slate-600 font-medium">No requests found</p>
              <p className="text-slate-400 text-sm mt-1">
                Try adjusting your filters or book a new service
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white rounded-xl border ${req.status !== "pending" ? "border-teal-200 ring-1 ring-teal-100" : "border-slate-200"} p-5 shadow-sm hover:shadow-md transition-all`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-bold text-slate-800">
                          {req.type
                            ? req.type.replace("_", " ").toUpperCase()
                            : "REQUEST"}
                        </h3>
                        <StatusBadge status={req.status} />
                        {/* <MemberBadge member={req.member} /> - Member field missing in schema currently */}
                      </div>
                      <p className="text-xs text-slate-500 mb-2">
                        ID:{" "}
                        <span className="font-mono">
                          {req.request_id_display || req.id.slice(0, 8)}
                        </span>
                      </p>
                      <p className="text-sm text-slate-600 mb-2">
                        {req.description ||
                          req.details?.description ||
                          req.details?.subject ||
                          "No description"}
                      </p>

                      {/* Details based on jsonb 'details' if available */}
                      {req.details?.doctor_name && (
                        <p className="text-xs text-slate-500">
                          Doctor:{" "}
                          <span className="text-slate-700">
                            {req.details.doctor_name}
                          </span>
                        </p>
                      )}
                      {req.details?.symptoms && (
                        <p className="text-xs text-slate-500">
                          Symptoms:{" "}
                          <span className="text-slate-700">
                            {req.details.symptoms}
                          </span>
                        </p>
                      )}
                      {req.details?.preferredTime && (
                        <p className="text-xs text-slate-500">
                          Preferred Time:{" "}
                          <span className="text-slate-700">
                            {req.details.preferredTime}
                          </span>
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-2">
                        Submitted:{" "}
                        {new Date(req.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {/* Team Reply */}
                      {req.admin_notes && (
                        <div
                          className={`mt-4 p-3 rounded-lg text-sm ${
                            req.status === "rejected"
                              ? "bg-red-50 border border-red-100 text-red-700"
                              : "bg-teal-50 border border-teal-100 text-teal-800"
                          }`}
                        >
                          <span className="font-semibold">Team Reply: </span>
                          {req.admin_notes}
                        </div>
                      )}

                      {!req.admin_notes && req.status === "pending" && (
                        <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-sm">
                          <span className="font-semibold">Status: </span>
                          Awaiting team response. We will update you soon.
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/service-requests/${req.id}`}
                      className="text-sm font-medium text-teal-600 hover:text-teal-700 hover:underline whitespace-nowrap flex-shrink-0"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
