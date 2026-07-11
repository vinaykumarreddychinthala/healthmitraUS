"use client";

import { useState, useCallback } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Ambulance, MapPin, Clock, AlertTriangle, PhoneCall, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AmbulanceBookingWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

interface LocationData {
    street: string;
    sector: string;   // e.g. "Sector 62" (sublocality_level_2)
    locality: string; // e.g. "Noida" (sublocality_level_1)
    city: string;
    pincode: string;
    state: string;
    country: string;
    formattedAddress: string;
}

type LocationStatus = "idle" | "loading" | "success" | "error";

export function AmbulanceBookingWizard({ isOpen, onClose }: AmbulanceBookingWizardProps) {
    const [step, setStep] = useState(1);
    const [urgency, setUrgency] = useState("immediate");

    // Location state
    const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
    const [locationError, setLocationError] = useState<string>("");
    const [pickupLocation, setPickupLocation] = useState<LocationData>({
        street: "",
        sector: "",
        locality: "",
        city: "",
        pincode: "",
        state: "",
        country: "",
        formattedAddress: "",
    });

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const detectLocation = useCallback(async () => {
        setLocationStatus("loading");
        setLocationError("");

        if (!navigator.geolocation) {
            setLocationStatus("error");
            setLocationError("Geolocation is not supported by your browser.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const res = await fetch(
                        `/api/geocode?lat=${latitude}&lng=${longitude}`
                    );
                    const data = await res.json();

                    if (!res.ok) {
                        throw new Error(data.error || "Failed to get location details.");
                    }

                    setPickupLocation(data as LocationData);
                    setLocationStatus("success");
                } catch (err: unknown) {
                    setLocationStatus("error");
                    setLocationError(
                        err instanceof Error ? err.message : "Could not detect location."
                    );
                }
            },
            (geoError) => {
                setLocationStatus("error");
                switch (geoError.code) {
                    case geoError.PERMISSION_DENIED:
                        setLocationError("Location permission denied. Please allow access and try again.");
                        break;
                    case geoError.POSITION_UNAVAILABLE:
                        setLocationError("Location information is unavailable.");
                        break;
                    case geoError.TIMEOUT:
                        setLocationError("Location request timed out. Please try again.");
                        break;
                    default:
                        setLocationError("An unknown error occurred.");
                }
            },
            { timeout: 10000, maximumAge: 60000 }
        );
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2 bg-red-50 p-3 rounded-lg border border-red-100">
                        <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-pulse">
                            <PhoneCall className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-red-700">Emergency Ambulance Service</DialogTitle>
                            <p className="text-xs text-red-600 font-medium">For life-threatening emergencies, call 102 / 108 immediately.</p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <div
                        className="h-full bg-red-600 transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                {/* STEP 1: TYPE & PATIENT */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label>Ambulance Type *</Label>
                            <RadioGroup defaultValue="bls" className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="flex flex-col items-center justify-center text-center space-y-2 rounded-xl border-2 border-slate-200 p-4 hover:bg-slate-50 cursor-pointer transition-all [&:has(:checked)]:border-red-500 [&:has(:checked)]:bg-red-50/50">
                                    <RadioGroupItem value="bls" id="bls" className="sr-only" />
                                    <Label htmlFor="bls" className="cursor-pointer w-full h-full flex flex-col items-center">
                                        <Ambulance className="h-8 w-8 text-blue-500 mb-2" />
                                        <span className="font-bold text-slate-900">Basic (BLS)</span>
                                        <span className="text-xs text-slate-500 mt-1">For stable patients</span>
                                    </Label>
                                </div>
                                <div className="flex flex-col items-center justify-center text-center space-y-2 rounded-xl border-2 border-slate-200 p-4 hover:bg-slate-50 cursor-pointer transition-all [&:has(:checked)]:border-red-500 [&:has(:checked)]:bg-red-50/50">
                                    <RadioGroupItem value="als" id="als" className="sr-only" />
                                    <Label htmlFor="als" className="cursor-pointer w-full h-full flex flex-col items-center">
                                        <div className="relative">
                                            <Ambulance className="h-8 w-8 text-red-500 mb-2" />
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>
                                        </div>
                                        <span className="font-bold text-slate-900">Advanced (ALS)</span>
                                        <span className="text-xs text-slate-500 mt-1">ICU on wheels</span>
                                    </Label>
                                </div>
                                <div className="flex flex-col items-center justify-center text-center space-y-2 rounded-xl border-2 border-slate-200 p-4 hover:bg-slate-50 cursor-pointer transition-all [&:has(:checked)]:border-red-500 [&:has(:checked)]:bg-red-50/50">
                                    <RadioGroupItem value="pt" id="pt" className="sr-only" />
                                    <Label htmlFor="pt" className="cursor-pointer w-full h-full flex flex-col items-center">
                                        <Ambulance className="h-8 w-8 text-green-500 mb-2" />
                                        <span className="font-bold text-slate-900">Transport</span>
                                        <span className="text-xs text-slate-500 mt-1">Non-emergency</span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Patient Name *</Label>
                                <Input defaultValue="Rajesh Kumar" />
                            </div>
                            <div className="space-y-2">
                                <Label>Patient Age *</Label>
                                <Input defaultValue="35" type="number" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Medical Condition</Label>
                            <Textarea placeholder="Briefly describe the emergency..." className="min-h-[60px]" />
                        </div>
                    </div>
                )}

                {/* STEP 2: LOCATION */}
                {step === 2 && (
                    <div className="space-y-6">
                        {/* Pickup Location */}
                        <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-5 w-5 text-red-500" />
                                <h4 className="font-semibold text-slate-900">Pickup Location</h4>
                            </div>

                            {/* Detect Location Button */}
                            <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                    "w-full gap-2 border-dashed transition-all",
                                    locationStatus === "success"
                                        ? "border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-50"
                                        : "text-blue-600 hover:text-blue-700 hover:border-blue-400"
                                )}
                                onClick={detectLocation}
                                disabled={locationStatus === "loading"}
                            >
                                {locationStatus === "loading" && (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                {locationStatus === "success" && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                )}
                                {locationStatus === "idle" || locationStatus === "error" ? (
                                    <MapPin className="h-4 w-4" />
                                ) : null}

                                {locationStatus === "loading"
                                    ? "Detecting your location..."
                                    : locationStatus === "success"
                                    ? "Location detected — click to refresh"
                                    : "Use Current Location (Auto-fill via GPS)"}
                            </Button>

                            {/* Error message */}
                            {locationStatus === "error" && (
                                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>{locationError}</span>
                                </div>
                            )}

                            {/* Structured Address Fields */}
                            <div className="grid grid-cols-1 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                        Street Address
                                    </Label>
                                    <Input
                                        placeholder="House No., Building, Street Name"
                                        value={pickupLocation.street}
                                        onChange={(e) =>
                                            setPickupLocation((prev) => ({ ...prev, street: e.target.value }))
                                        }
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                            Sector / Block
                                        </Label>
                                        <Input
                                            placeholder="e.g. Sector 62, Block A"
                                            value={pickupLocation.sector}
                                            onChange={(e) =>
                                                setPickupLocation((prev) => ({ ...prev, sector: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                            Locality
                                        </Label>
                                        <Input
                                            placeholder="Neighbourhood / Area"
                                            value={pickupLocation.locality}
                                            onChange={(e) =>
                                                setPickupLocation((prev) => ({ ...prev, locality: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>


                                <div className="space-y-1.5">
                                    <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                        City
                                    </Label>
                                    <Input
                                        placeholder="City"
                                        value={pickupLocation.city}
                                        onChange={(e) =>
                                            setPickupLocation((prev) => ({ ...prev, city: e.target.value }))
                                        }
                                    />
                                </div>


                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                            Pincode
                                        </Label>
                                        <Input
                                            placeholder="000000"
                                            value={pickupLocation.pincode}
                                            onChange={(e) =>
                                                setPickupLocation((prev) => ({ ...prev, pincode: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                            State
                                        </Label>
                                        <Input
                                            placeholder="State"
                                            value={pickupLocation.state}
                                            onChange={(e) =>
                                                setPickupLocation((prev) => ({ ...prev, state: e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                                            Country
                                        </Label>
                                        <Input
                                            placeholder="Country"
                                            value={pickupLocation.country}
                                            onChange={(e) =>
                                                setPickupLocation((prev) => ({ ...prev, country: e.target.value }))
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Destination */}
                        <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-white">
                            <div className="flex items-center gap-2 mb-1">
                                <MapPin className="h-5 w-5 text-green-500" />
                                <h4 className="font-semibold text-slate-900">Destination</h4>
                            </div>
                            <div className="space-y-2">
                                <Label>Hospital / Address *</Label>
                                <Input placeholder="Search Hospital or Enter Address" />
                                <div className="flex items-center space-x-2 mt-2">
                                    <Checkbox id="network" />
                                    <Label htmlFor="network" className="font-normal text-xs">Show only Network Hospitals</Label>
                                </div>
                            </div>
                        </div>

                        {/* Timing */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Required Time *</Label>
                                <Select value={urgency} onValueChange={setUrgency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="immediate">Immediate (ASAP)</SelectItem>
                                        <SelectItem value="scheduled">Schedule for later</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {urgency === "scheduled" && (
                                <div className="space-y-2">
                                    <Label>Time</Label>
                                    <Input type="datetime-local" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: CONFIRM */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-6 rounded-xl text-center space-y-4">
                            <div className="flex justify-center text-4xl mb-2">🚑</div>
                            <div>
                                <h3 className="text-2xl font-bold">~15 mins</h3>
                                <p className="text-slate-400">Estimated Arrival Time</p>
                            </div>
                            <div className="pt-4 border-t border-slate-700 flex justify-between text-sm">
                                <span>Distance: 12.5 km</span>
                                <span className="font-bold text-emerald-400">$ 1,200 - $ 1,500</span>
                            </div>
                        </div>

                        {/* Show detected pickup address in confirm step */}
                        {pickupLocation.formattedAddress && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                                    <MapPin className="h-4 w-4 text-red-500" />
                                    Pickup Location
                                </div>
                                <p className="text-xs text-slate-600">{pickupLocation.formattedAddress}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                                    {pickupLocation.street && <span><span className="font-medium">Street:</span> {pickupLocation.street}</span>}
                                    {pickupLocation.sector && <span><span className="font-medium">Sector:</span> {pickupLocation.sector}</span>}
                                    {pickupLocation.locality && <span><span className="font-medium">Locality:</span> {pickupLocation.locality}</span>}
                                    {pickupLocation.city && <span><span className="font-medium">City:</span> {pickupLocation.city}</span>}
                                    {pickupLocation.pincode && <span><span className="font-medium">Pincode:</span> {pickupLocation.pincode}</span>}
                                    {pickupLocation.state && <span><span className="font-medium">State:</span> {pickupLocation.state}</span>}
                                    {pickupLocation.country && <span><span className="font-medium">Country:</span> {pickupLocation.country}</span>}
                                </div>
                            </div>
                        )}

                        <div className="flex items-start space-x-2">
                            <Checkbox id="emergency-auth" />
                            <Label htmlFor="emergency-auth" className="text-sm text-slate-700 leading-tight font-medium">
                                I confirm this is a valid request and authorize emergency services. I understand that misuse of emergency services is punishable.
                            </Label>
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-8 flex justify-between items-center w-full sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={step === 1 ? onClose : handleBack}
                        className="w-[100px]"
                    >
                        {step === 1 ? "Cancel" : "Back"}
                    </Button>

                    <Button
                        onClick={step === 3 ? onClose : handleNext}
                        className={cn(
                            "w-[140px] text-white",
                            step === 3 ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-slate-900 hover:bg-slate-800"
                        )}
                    >
                        {step === 3 ? "BOOK AMBULANCE" : "Next →"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
