"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Stethoscope, Calendar, Clock, Phone, FileText } from "lucide-react";

interface MedicalConsultationFormProps {
    onSuccess?: () => void;
}

export function MedicalConsultationForm({ onSuccess }: MedicalConsultationFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        specialty: "",
        date: "",
        preferredTime: "",
        symptoms: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch("/api/consultation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (data.success) {
                toast.success("Consultation requested successfully!");
                if (onSuccess) onSuccess();
                setFormData({
                    name: "",
                    phone: "",
                    specialty: "",
                    date: "",
                    preferredTime: "",
                    symptoms: ""
                });
            } else {
                toast.error(data.error || "Failed to request consultation");
            }
        } catch (error) {
            toast.error("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-lg border border-slate-200">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-t-xl border-b border-slate-100">
                <CardTitle className="text-xl flex items-center gap-2 text-teal-800">
                    <Stethoscope className="w-5 h-5" />
                    Book Medical Consultation
                </CardTitle>
                <CardDescription className="text-teal-600/80">
                    Request an online or in-person consultation with our specialists.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">Patient Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                placeholder="Full Name"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> Phone Number</label>
                            <input
                                required
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "") })}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                                placeholder="Mobile Number"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Specialty</label>
                        <select
                            required
                            value={formData.specialty}
                            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                        >
                            <option value="">Select Specialty...</option>
                            <option value="General Physician">General Physician</option>
                            <option value="Cardiologist">Cardiologist</option>
                            <option value="Dermatologist">Dermatologist</option>
                            <option value="Pediatrician">Pediatrician</option>
                            <option value="Orthopedic">Orthopedic</option>
                            <option value="Gynecologist">Gynecologist</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Preferred Date</label>
                            <input
                                required
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Preferred Time</label>
                            <select
                                required
                                value={formData.preferredTime}
                                onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                            >
                                <option value="">Select Time...</option>
                                <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
                                <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                                <option value="Evening (4 PM - 8 PM)">Evening (4 PM - 8 PM)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5"/> Symptoms / Notes</label>
                        <textarea
                            rows={3}
                            value={formData.symptoms}
                            onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white resize-none"
                            placeholder="Briefly describe your symptoms or reason for consultation..."
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        {loading ? "Submitting Request..." : "Request Consultation"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
