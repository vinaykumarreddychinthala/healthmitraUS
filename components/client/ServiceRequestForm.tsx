"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Upload,
  MapPin,
  Phone,
  Building,
  Search,
  Navigation,
  X,
  FileText,
  Calendar,
  Clock,
  Stethoscope,
  Syringe,
  Pill,
  User,
  AlertCircle,
} from "lucide-react";
import { createServiceRequest } from "@/app/actions/service-requests";
import type { ServiceRequestContext } from '@/components/client/services/PlanPolicySelector';

// Terms Modal Component
function TermsModal({
  service,
  isOpen,
  onClose,
  onAgree,
}: {
  service: string;
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const termsContent: Record<
    string,
    { title: string; sections: { title: string; content: string }[] }
  > = {
    ambulance: {
      title: "Terms & Conditions for Ambulance Service",
      sections: [
        {
          title: "1. Service Agreement",
          content:
            "By requesting ambulance services, you agree to pay all applicable charges including base fare ($800-1500), per-kilometer charges ($50-75/km), waiting time charges ($100 per 15 minutes after first 30 minutes), and any medical supplies used during transport.",
        },
        {
          title: "2. Medical Consent",
          content:
            "You consent to emergency medical assessment, basic life support, oxygen administration, cardiac monitoring, IV fluid administration, and transportation to the nearest appropriate medical facility. In case of unconscious patient, this consent is presumed as per Good Samaritan laws.",
        },
        {
          title: "3. Liability Waiver",
          content:
            "HealthMitra and its partner ambulance providers are not liable for: delays caused by traffic, weather, natural disasters, or road conditions; deterioration of patient condition during transport; refusal of admission by hospitals; or any pre-existing conditions. Response time estimates (8-12 minutes) are not guaranteed.",
        },
        {
          title: "4. Insurance & Payment",
          content:
            "Ambulance charges are your responsibility unless fully covered by your insurance policy. Cashless facility is available only with partnered insurers. Payment is due immediately upon service completion or admission to hospital.",
        },
        {
          title: "5. Cancellation Policy",
          content:
            "• Cancellation within 2 minutes of booking: No charges\n• Cancellation after ambulance dispatch: 50% of base fare\n• Cancellation after arrival at pickup location: Full base fare\n• No-show when ambulance arrives: Full fare + waiting charges",
        },
        {
          title: "6. Data Privacy & Location Tracking",
          content:
            "Your real-time location is shared only with dispatched ambulance crew for navigation purposes. Location history is deleted after 24 hours. Medical information shared is protected under applicable privacy laws.",
        },
        {
          title: "7. Right to Refuse Service",
          content:
            "Ambulance crew may refuse transport if: patient is violent or abusive; patient has infectious disease without proper protective equipment; requested destination is beyond service area (50km limit); ambulance is not medically equipped for patient's condition.",
        },
      ],
    },
    medical_consultation: {
      title: "Terms & Conditions for Doctor Consultation",
      sections: [
        {
          title: "1. Consultation Agreement",
          content:
            "By booking a consultation, you agree to pay the consultation fee ($300-1500 depending on doctor). Fees are non-refundable if cancellation is less than 2 hours before appointment. No-show appointments are charged 100% of fee.",
        },
        {
          title: "2. Teleconsultation Terms",
          content:
            "You confirm that you have a stable internet connection (minimum 2 Mbps). Video consultations are recorded for quality and training purposes with your consent. Prescriptions issued are valid as per Telemedicine Practice Guidelines 2023.",
        },
        {
          title: "3. Medical Disclaimer",
          content:
            "Online consultations are not replacements for physical examination. Doctors cannot perform physical assessments, vital checks, or certain diagnostic procedures. For emergencies, please call 108 or visit nearest hospital immediately.",
        },
        {
          title: "4. Prescription Policy",
          content:
            "E-prescriptions are digitally signed and valid across India. Schedule H and X drugs cannot be prescribed via teleconsultation. Controlled substances require physical consultation.",
        },
        {
          title: "5. Cancellation & Refund",
          content:
            "• Cancellation 24+ hours before: 100% refund\n• Cancellation 2-24 hours before: 50% refund\n• Cancellation less than 2 hours: No refund\n• Doctor cancels: 100% refund + free rescheduling",
        },
      ],
    },
    diagnostic: {
      title: "Terms & Conditions for Lab Tests",
      sections: [
        {
          title: "1. Service Agreement",
          content:
            "Home sample collection is available within 10km of partner labs. Collection timings: 6 AM - 8 PM. Phlebotomist will carry government ID. You must provide accurate patient information and medical history including bleeding disorders or needle phobia.",
        },
        {
          title: "2. Fasting & Preparation",
          content:
            "You are responsible for following test preparation instructions (fasting, medication hold, etc.) sent via SMS/Email. Failure to comply may result in inaccurate results or need for re-collection (additional charges apply).",
        },
        {
          title: "3. Report Delivery",
          content:
            "• Routine tests: 6-12 hours\n• Specialized tests: 24-72 hours\n• Genetic/Histopathology: 3-7 days\n• Reports are preliminary until digitally signed by pathologist",
        },
        {
          title: "4. Quality Guarantee",
          content:
            "All partner labs are NABL accredited or ISO 15189 certified. In case of report errors due to lab negligence, free re-testing at different lab is provided. However, we are not liable for treatment decisions based on reports.",
        },
        {
          title: "5. Cancellation & Rescheduling",
          content:
            "• Free cancellation up to 2 hours before collection\n• Free rescheduling anytime\n• After phlebotomist dispatch: $100 cancellation fee\n• After sample collection: No cancellation, payment forfeited",
        },
      ],
    },

    caretaker: {
      title: "Terms & Conditions for Caretaker Services",
      sections: [
        {
          title: "1. Service Scope",
          content:
            "Caretakers provide assistance with daily activities, medication reminders, companionship, and light housekeeping. Medical procedures are not performed by caretakers.",
        },
        {
          title: "2. Minimum Booking",
          content:
            "Minimum booking duration: 4 hours/day for 7 days. Cancellation requires 24-hour notice for full refund.",
        },
        {
          title: "3. Background Verification",
          content:
            "All caretakers undergo police verification and professional reference checks. Replacement available within 24 hours if not satisfied.",
        },
      ],
    },
    nursing: {
      title: "Terms & Conditions for Nursing Services",
      sections: [
        {
          title: "1. Qualified Nurses",
          content:
            "All nurses are RNRM qualified with minimum 2 years experience. Services include wound dressing, IV insertion, catheter care, vital monitoring, and medication administration.",
        },
        {
          title: "2. Medical Supervision",
          content:
            "Nurses work under supervision of your treating doctor. Doctor's prescription required for any medical procedure.",
        },
        {
          title: "3. Liability",
          content:
            "We are not liable for treatment outcomes or complications arising from prescribed medical procedures.",
        },
      ],
    },
  };

  const content = termsContent[service] || termsContent.medical_consultation;

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">{content.title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div
          className="p-6 overflow-y-auto space-y-4 text-sm"
          onScroll={handleScroll}
        >
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-amber-800 text-xs">
              ⚠️ Please read carefully. These terms affect your legal rights.
              Last updated: January 15, 2024
            </p>
          </div>

          {content.sections.map((section, idx) => (
            <div key={idx}>
              <h4 className="font-bold text-slate-800 mb-2">{section.title}</h4>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {section.content}
              </p>
            </div>
          ))}

          <div className="bg-slate-50 rounded-lg p-4 mt-4">
            <p className="text-slate-700 text-xs">
              By clicking "I Understand & Agree", you confirm that you have
              read, understood, and agree to be bound by these Terms &
              Conditions. You also consent to electronic communications and
              agree to our Privacy Policy and Data Processing terms.
            </p>
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onAgree}
            disabled={!hasScrolledToBottom}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              hasScrolledToBottom
                ? "bg-teal-600 hover:bg-teal-700 text-white cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {hasScrolledToBottom
              ? "I Understand & Agree"
              : "Please read to the bottom to agree"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Updated schema with proper validation
const formSchema = z.object({
  type: z.string(),
  memberId: z.string().min(1, "Please select a member"),
  description: z.string().optional(),
  agreedToTerms: z
    .boolean()
    .refine(
      (val) => val === true,
      "You must read and agree to the Terms & Conditions",
    ),

  // Ambulance fields
  urgency: z.string().optional(),
  ambulanceType: z.string().optional(),
  patientName: z.string().optional(),
  patientAge: z.string().optional(),
  patientPhone: z.string().optional(),
  pickupAddressLine1: z.string().optional(),
  pickupAddressLine2: z.string().optional(),
  pickupCity: z.string().optional(),
  pickupState: z.string().optional(),
  pickupPincode: z.string().optional(),
  pickupLandmark: z.string().optional(),
  destinationHospitalId: z.string().optional(),
  destinationHospitalName: z.string().optional(),
  destinationAddress: z.string().optional(),
  destinationCity: z.string().optional(),
  destinationContact: z.string().optional(),
  notesForCrew: z.string().optional(),

  // Doctor Consultation fields
  specialization: z.string().optional(),
  consultationType: z.string().optional(),
  symptoms: z.string().optional(),
  existingConditions: z.string().optional(),
  currentMedications: z.string().optional(),
  preferredDate: z.string().optional(),
  preferredTimeSlot: z.string().optional(),
  patientPhoneNumber: z.string().optional(),

  // Diagnostic fields
  testNames: z.array(z.string()).optional(),
  collectionType: z.string().optional(),
  collectionAddress: z.string().optional(),
  isFasting: z.string().optional(),
  lastMealTime: z.string().optional(),


  // Caretaker/Nursing
  serviceType: z.string().optional(),
  duration: z.string().optional(),
  startDate: z.string().optional(),
  requirements: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ServiceRequestFormProps {
  initialType?: string;
  userProfile?: any;
  vouchers?: { code: string; value: number; description: string }[];
  allowedServices?: string[];
  serviceContext?: ServiceRequestContext;  // Plan + Policy Holder context from wizard
}

const NEARBY_HOSPITALS = [
  {
    id: "1",
    name: "Apollo Hospital",
    address: "Greams Road",
    city: "Chennai",
    pincode: "600006",
    phone: "044-28290200",
  },
  {
    id: "2",
    name: "Fortis Hospital",
    address: "Vadapalani",
    city: "Chennai",
    pincode: "600026",
    phone: "044-42920000",
  },
  {
    id: "3",
    name: "Global Hospitals",
    address: "Perumbakkam",
    city: "Chennai",
    pincode: "600100",
    phone: "044-40808080",
  },
  {
    id: "4",
    name: "MIOT International",
    address: "Manapakkam",
    city: "Chennai",
    pincode: "600089",
    phone: "044-22492249",
  },
];

export function ServiceRequestForm({
  initialType,
  userProfile,
  vouchers = [],
  allowedServices = [],
  serviceContext,
}: ServiceRequestFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [manualDestination, setManualDestination] = useState(false);

  const typeFromUrl = searchParams.get("type");
  
  // Determine if the user has access to any services
  const hasAccess = allowedServices.length > 0;
  
  const requestedType = initialType || typeFromUrl;
  const isRequestedTypeAllowed = requestedType && allowedServices.includes(requestedType);
  const isExplicitlyBlocked = requestedType && !isRequestedTypeAllowed && hasAccess;
  const fallbackType = hasAccess ? allowedServices[0] : "medical_consultation";
  const defaultType = isRequestedTypeAllowed ? requestedType : fallbackType;

  // Pre-fill patient name from policy holder
  const policyHolderName = serviceContext?.policyHolder?.holderFullName || '';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: defaultType,
      memberId: serviceContext?.policyHolder?.memberId || "Myself",
      agreedToTerms: false,
      collectionType: "home",
      ambulanceType: "bls",
      urgency: "scheduled",
      consultationType: "video",
      isFasting: "no",
      // Pre-fill patient name from policy holder
      patientName: policyHolderName,
    },
  });

  const watchType = form.watch("type");
  const watchAmbulanceType = form.watch("ambulanceType");
  const watchUrgency = form.watch("urgency");

  useEffect(() => {
    if (userProfile?.phone) {
      form.setValue("patientPhone", userProfile.phone);
      form.setValue("patientPhoneNumber", userProfile.phone);
    }
    if (userProfile?.address)
      form.setValue("pickupAddressLine1", userProfile.address);
    if (userProfile?.city) form.setValue("pickupCity", userProfile.city);
    if (userProfile?.pincode)
      form.setValue("pickupPincode", userProfile.pincode);
  }, [userProfile, form]);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&addressdetails=1`,
          );
          const data = await response.json();
          if (data.address) {
            form.setValue(
              "pickupAddressLine1",
              data.address.road || data.address.suburb || "",
            );
            form.setValue(
              "pickupCity",
              data.address.city || data.address.town || "",
            );
            form.setValue("pickupState", data.address.state || "");
            form.setValue("pickupPincode", data.address.postcode || "");
            toast.success("Location detected successfully");
          }
        } catch {
          toast.success("Location coordinates captured");
        }
        setLocationLoading(false);
      },
      () => {
        toast.error("Unable to get location");
        setLocationLoading(false);
      },
    );
  };

  const handleHospitalSelect = (hospitalId: string) => {
    setSelectedHospital(hospitalId);
    if (hospitalId === "other") {
      setManualDestination(true);
    } else {
      setManualDestination(false);
      const hospital = NEARBY_HOSPITALS.find((h) => h.id === hospitalId);
      if (hospital) {
        form.setValue("destinationHospitalId", hospital.id);
        form.setValue("destinationHospitalName", hospital.name);
        form.setValue("destinationAddress", hospital.address);
        form.setValue("destinationCity", hospital.city);
        form.setValue("destinationContact", hospital.phone);
      }
    }
  };

  async function onSubmit(data: FormValues) {
    if (!data.agreedToTerms) {
      setShowTermsModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createServiceRequest({
        type: data.type,
        memberId: data.memberId,
        details: {
          ...data,
          agreedToTerms: undefined,
          // Embed plan + policy holder context for admin visibility
          plan_id: serviceContext?.plan?.planId,
          plan_name: serviceContext?.plan?.planName,
          card_unique_id: serviceContext?.plan?.cardUniqueId,
          policy_holder_name: serviceContext?.policyHolder?.holderFullName,
          policy_holder_relation: serviceContext?.policyHolder?.relation,
        },
      });

      if (result.success) {
        toast.success("Service request submitted successfully!");
        router.push("/service-requests");
      } else {
        toast.error("Failed to submit request", { description: result.error });
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  const getTitle = () => {
    const titles: Record<string, string> = {
      ambulance: "🚑 Book Ambulance Service",
      medical_consultation: "👨‍⚕️ Doctor Appointment",
      diagnostic: "🔬 Book Diagnostic Test",
      caretaker: "🤝 Caretaker Services",
      nursing: "🏥 Nursing Procedures",
    };
    return titles[watchType] || "Service Request";
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Button
        variant="ghost"
        onClick={() => router.push("/service-requests")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold mb-6">{getTitle()}</h1>

        {!hasAccess ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Subscriptions</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              You do not have access to any services. Please purchase a subscription plan to request services.
            </p>
            <Button onClick={() => router.push("/shop/plans")} className="bg-teal-600 hover:bg-teal-700">
              View Plans
            </Button>
          </div>
        ) : isExplicitlyBlocked ? (
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Service Not Covered</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Your current plan does not cover this service. Please explore other plans to get access to this service.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => router.push("/shop/plans")} className="bg-teal-600 hover:bg-teal-700">
                Explore Plans
              </Button>
              <Button variant="outline" onClick={() => router.push("/service-requests/new")}>
                View Available Services
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Service Selection */}
            <div className="space-y-2">
              <Label>Select Service</Label>
              <Select
                onValueChange={(val) => form.setValue("type", val)}
                defaultValue={defaultType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Service" />
                </SelectTrigger>
                <SelectContent>
                  {allowedServices.includes("ambulance") && <SelectItem value="ambulance">🚑 Ambulance Service</SelectItem>}
                  {allowedServices.includes("medical_consultation") && <SelectItem value="medical_consultation">👨‍⚕️ Doctor Appointment</SelectItem>}
                  {allowedServices.includes("diagnostic") && <SelectItem value="diagnostic">🔬 Diagnostic Test</SelectItem>}
                  {allowedServices.includes("caretaker") && <SelectItem value="caretaker">🤝 Caretaker Services</SelectItem>}
                  {allowedServices.includes("nursing") && <SelectItem value="nursing">🏥 Nursing Procedures</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Member Selection — replaced by PlanPolicySelector wizard */}
            {/* Policy Holder is now pre-selected in the wizard step before the form */}
            {serviceContext && (
              <div className="space-y-1">
                <Label className="text-slate-600">Policy Holder</Label>
                <div className="flex items-center gap-2 h-10 px-4 rounded-xl border border-teal-200 bg-teal-50 text-sm">
                  <User className="h-4 w-4 text-teal-600 shrink-0" />
                  <span className="font-semibold text-teal-800">{serviceContext.policyHolder.holderFullName}</span>
                  <span className="text-teal-600">({serviceContext.policyHolder.relation})</span>
                  <span className="ml-auto text-xs text-teal-500">Pre-filled ✓</span>
                </div>
              </div>
            )}

          {/* ===== AMBULANCE SERVICE ===== */}
          {watchType === "ambulance" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-semibold">Urgency Level</Label>
                <RadioGroup
                  onValueChange={(val) => form.setValue("urgency", val)}
                  defaultValue="scheduled"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-red-200 bg-red-50">
                    <RadioGroupItem value="immediate" id="urgent" />
                    <Label
                      htmlFor="urgent"
                      className="text-red-700 font-semibold cursor-pointer"
                    >
                      🚨 Immediate (Emergency) - Dispatch within 2 minutes
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200">
                    <RadioGroupItem value="scheduled" id="scheduled" />
                    <Label htmlFor="scheduled" className="cursor-pointer">
                      Scheduled Transfer - For planned hospital visits
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  Ambulance Type
                </Label>
                <RadioGroup
                  onValueChange={(val) => form.setValue("ambulanceType", val)}
                  defaultValue="bls"
                  className="grid grid-cols-3 gap-3"
                >
                  {[
                    { value: "bls", label: "BLS", desc: "Basic Life Support" },
                    {
                      value: "als",
                      label: "ALS",
                      desc: "Advanced Life Support",
                    },
                    { value: "icu", label: "ICU", desc: "ICU Equipped" },
                  ].map((type) => (
                    <div
                      key={type.value}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer ${watchAmbulanceType === type.value ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}
                    >
                      <RadioGroupItem value={type.value} id={type.value} />
                      <Label htmlFor={type.value} className="cursor-pointer">
                        <span className="font-medium">{type.label}</span>
                        <p className="text-xs text-slate-500">{type.desc}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">
                  Patient Information
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    {...form.register("patientName")}
                    placeholder="Patient Full Name *"
                  />
                  <Input
                    {...form.register("patientAge")}
                    type="number"
                    placeholder="Age *"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    {...form.register("patientPhone")}
                    placeholder="Contact Number *"
                    className="pl-10"
                    maxLength={10}
                  />
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between">
                  <Label className="text-base font-semibold">
                    Pickup Location
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={locationLoading}
                  >
                    <Navigation
                      className={`h-4 w-4 mr-1 ${locationLoading ? "animate-spin" : ""}`}
                    />
                    {locationLoading ? "Detecting..." : "Use My Location"}
                  </Button>
                </div>
                <Input
                  {...form.register("pickupAddressLine1")}
                  placeholder="Address Line 1 *"
                />
                <Input
                  {...form.register("pickupAddressLine2")}
                  placeholder="Address Line 2 (Optional)"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    {...form.register("pickupLandmark")}
                    placeholder="Landmark"
                  />
                  <Input
                    {...form.register("pickupCity")}
                    placeholder="City *"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    onValueChange={(val) => form.setValue("pickupState", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                      <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                      <SelectItem value="Delhi">Delhi</SelectItem>
                      <SelectItem value="Karnataka">Karnataka</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      {...form.register("pickupPincode")}
                      placeholder="Pincode *"
                      className="pl-10"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4" /> Destination Hospital
                </Label>
                <Select onValueChange={handleHospitalSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select hospital" />
                  </SelectTrigger>
                  <SelectContent>
                    {NEARBY_HOSPITALS.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        <div>
                          <p className="font-medium">{h.name}</p>
                          <p className="text-xs text-slate-500">
                            {h.address}, {h.city}
                          </p>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="other">
                      Other Hospital (Enter manually)
                    </SelectItem>
                  </SelectContent>
                </Select>

                {manualDestination && (
                  <div className="space-y-3">
                    <Input
                      {...form.register("destinationHospitalName")}
                      placeholder="Hospital Name *"
                    />
                    <Textarea
                      {...form.register("destinationAddress")}
                      placeholder="Complete Address"
                      rows={2}
                    />
                  </div>
                )}

                <Textarea
                  {...form.register("notesForCrew")}
                  placeholder="Special instructions for ambulance crew (e.g., patient on oxygen, need stretcher)"
                  rows={2}
                />
              </div>

              {watchUrgency === "scheduled" && (
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" {...form.register("preferredDate")} />
                  <Select
                    onValueChange={(val) =>
                      form.setValue("preferredTimeSlot", val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">
                        Morning (8 AM - 12 PM)
                      </SelectItem>
                      <SelectItem value="afternoon">
                        Afternoon (12 PM - 4 PM)
                      </SelectItem>
                      <SelectItem value="evening">
                        Evening (4 PM - 8 PM)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* ===== DOCTOR CONSULTATION ===== */}
          {watchType === "medical_consultation" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Consultation Type</Label>
                <RadioGroup
                  onValueChange={(val) =>
                    form.setValue("consultationType", val)
                  }
                  defaultValue="video"
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="video" id="video" />
                    <Label htmlFor="video">📹 Video Call</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="inperson" id="inperson" />
                    <Label htmlFor="inperson">🏥 In-Person</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label>Patient Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    {...form.register("patientName")}
                    placeholder="Patient Full Name"
                  />
                  <Input
                    type="number"
                    {...form.register("patientAge")}
                    placeholder="Age"
                  />
                </div>
                <Input
                  {...form.register("patientPhoneNumber")}
                  placeholder="Contact Number"
                />
              </div>

              <div className="space-y-3">
                <Label>Appointment Details</Label>
                <Select
                  onValueChange={(val) => form.setValue("specialization", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Doctor Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Physician</SelectItem>
                    <SelectItem value="cardio">Cardiologist</SelectItem>
                    <SelectItem value="derma">Dermatologist</SelectItem>
                    <SelectItem value="pediatric">Pediatrician</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" {...form.register("preferredDate")} />
                  <Select
                    onValueChange={(val) =>
                      form.setValue("preferredTimeSlot", val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9-10">9:00 AM - 10:00 AM</SelectItem>
                      <SelectItem value="10-11">10:00 AM - 11:00 AM</SelectItem>
                      <SelectItem value="11-12">11:00 AM - 12:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Medical History</Label>
                <Textarea
                  {...form.register("symptoms")}
                  placeholder="Describe your symptoms, when they started, severity"
                  rows={3}
                />
                <Textarea
                  {...form.register("existingConditions")}
                  placeholder="Existing medical conditions (diabetes, hypertension, etc.)"
                  rows={2}
                />
                <Input
                  {...form.register("currentMedications")}
                  placeholder="Current medications"
                />
              </div>
            </div>
          )}

          {/* ===== DIAGNOSTIC TESTS ===== */}
          {watchType === "diagnostic" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Select Test Package</Label>
                <Select
                  onValueChange={(val) => form.setValue("testNames", [val])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose test" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-body">
                      Full Body Checkup - $999 (70+ tests)
                    </SelectItem>
                    <SelectItem value="diabetes">
                      Diabetes Care - $599 (12 tests)
                    </SelectItem>
                    <SelectItem value="cardiac">
                      Cardiac Profile - $1299 (25 tests)
                    </SelectItem>
                    <SelectItem value="thyroid">
                      Thyroid Profile - $399 (3 tests)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Patient Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    {...form.register("patientName")}
                    placeholder="Patient Name"
                  />
                  <Input
                    type="number"
                    {...form.register("patientAge")}
                    placeholder="Age"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Test Preparation</Label>
                <Select
                  onValueChange={(val) => form.setValue("isFasting", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Is fasting required?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">
                      Yes - 8-10 hours fasting
                    </SelectItem>
                    <SelectItem value="no">No - No fasting needed</SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("isFasting") === "yes" && (
                  <Input
                    type="time"
                    {...form.register("lastMealTime")}
                    placeholder="Last meal time"
                  />
                )}
              </div>

              <div className="space-y-3">
                <Label>Collection Address</Label>
                <Textarea
                  {...form.register("collectionAddress")}
                  placeholder="Full address for home sample collection"
                  rows={2}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" {...form.register("preferredDate")} />
                  <Select
                    onValueChange={(val) =>
                      form.setValue("preferredTimeSlot", val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6-9">6 AM - 9 AM</SelectItem>
                      <SelectItem value="9-12">9 AM - 12 PM</SelectItem>
                      <SelectItem value="12-15">12 PM - 3 PM</SelectItem>
                      <SelectItem value="15-18">3 PM - 6 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}


          {/* ===== CARETAKER SERVICES ===== */}
          {watchType === "caretaker" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Service Type</Label>
                <Select
                  onValueChange={(val) => form.setValue("serviceType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elderly">Elderly Care</SelectItem>
                    <SelectItem value="patient">
                      Patient Care (Post-surgery)
                    </SelectItem>
                    <SelectItem value="child">Child Care</SelectItem>
                    <SelectItem value="disabled">Disabled Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Duration</Label>
                <Select onValueChange={(val) => form.setValue("duration", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-hours">4 hours/day</SelectItem>
                    <SelectItem value="8-hours">
                      8 hours/day (Day shift)
                    </SelectItem>
                    <SelectItem value="12-hours">12 hours/day</SelectItem>
                    <SelectItem value="24-hours">24 hours (Live-in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Start Date</Label>
                <Input type="date" {...form.register("startDate")} />
              </div>

              <div className="space-y-3">
                <Label>Special Requirements</Label>
                <Textarea
                  {...form.register("requirements")}
                  placeholder="E.g., need male caretaker, experience with bedridden patients, etc."
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* ===== NURSING SERVICES ===== */}
          {watchType === "nursing" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Nursing Procedure Needed</Label>
                <Select
                  onValueChange={(val) => form.setValue("serviceType", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select procedure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wound">Wound Dressing</SelectItem>
                    <SelectItem value="injection">
                      Injection/IV Administration
                    </SelectItem>
                    <SelectItem value="catheter">Catheter Care</SelectItem>
                    <SelectItem value="bedsores">
                      Bed Sore Management
                    </SelectItem>
                    <SelectItem value="postop">Post-operative Care</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Duration</Label>
                <Select onValueChange={(val) => form.setValue("duration", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-hour">1 hour</SelectItem>
                    <SelectItem value="2-hours">2 hours</SelectItem>
                    <SelectItem value="4-hours">4 hours</SelectItem>
                    <SelectItem value="8-hours">8 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Additional Notes</Label>
                <Textarea
                  {...form.register("requirements")}
                  placeholder="Any specific instructions from doctor"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Terms & Conditions Checkbox with Modal Trigger */}
          <div className="flex items-start space-x-2 pt-4 border-t">
            <Checkbox
              id="terms"
              checked={form.watch("agreedToTerms")}
              onCheckedChange={(c) =>
                form.setValue("agreedToTerms", c as boolean)
              }
            />
            <Label htmlFor="terms" className="text-sm text-slate-600">
              I have read and agree to the{" "}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-teal-600 underline font-medium hover:text-teal-700"
              >
                Terms & Conditions
              </button>{" "}
              for this service.
            </Label>
          </div>
          {form.formState.errors.agreedToTerms && (
            <p className="text-sm text-red-500">
              {form.formState.errors.agreedToTerms.message}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {watchType === "ambulance" && watchUrgency === "immediate"
              ? "🚨 Request Ambulance Now"
              : "Submit Request"}
          </Button>
        </form>
        )}
      </div>

      {/* Terms Modal */}
      <TermsModal
        service={watchType}
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAgree={() => {
          form.setValue("agreedToTerms", true);
          setShowTermsModal(false);
          toast.success("You have agreed to the Terms & Conditions");
        }}
      />
    </div>
  );
}
