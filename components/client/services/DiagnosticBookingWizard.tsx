"use client";

import { useState } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Search, X, TestTube, MapPin, Calendar, CheckCircle } from "lucide-react";

interface DiagnosticBookingWizardProps {
    isOpen: boolean;
    onClose: () => void;
    testCatalog?: { id: number; name: string; price: number; category: string }[];
}

export function DiagnosticBookingWizard({ isOpen, onClose, testCatalog = [] }: DiagnosticBookingWizardProps) {
    const [step, setStep] = useState(1);
    const [selectedTests, setSelectedTests] = useState<any[]>([]);
    const [testSearch, setTestSearch] = useState("");
    const [collectionType, setCollectionType] = useState("home");
    const [bookingDate, setBookingDate] = useState("");

    // Returns true if the slot's start hour is already in the past.
    // If no date is selected, treats as today by default.
    const isSlotPastWizard = (slotStartHour: number): boolean => {
        const now = new Date();
        if (bookingDate) {
            const todayStr = now.toISOString().split('T')[0];
            if (bookingDate !== todayStr) return false;
        }
        return slotStartHour < now.getHours() ||
            (slotStartHour === now.getHours() && now.getMinutes() > 0);
    };

    // Search Logic
    const filteredTests = testSearch.length > 1
        ? testCatalog.filter(t => t.name.toLowerCase().includes(testSearch.toLowerCase()) && !selectedTests.find(st => st.id === t.id))
        : [];

    const addTest = (test: any) => {
        setSelectedTests([...selectedTests, test]);
        setTestSearch("");
    };

    const removeTest = (testId: number) => {
        setSelectedTests(selectedTests.filter(t => t.id !== testId));
    };

    const totalAmount = selectedTests.reduce((sum, t) => sum + t.price, 0);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const resetAndClose = () => {
        setStep(1);
        setSelectedTests([]);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between mb-2">
                        <DialogTitle>Diagnostic Test Booking</DialogTitle>
                        <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Step {step} of 3</span>
                    </div>
                    <DialogDescription>
                        {step === 1 && "Select Member & Tests"}
                        {step === 2 && "Schedule & Location"}
                        {step === 3 && "Review & Confirm"}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-slate-100 rounded-full mb-6 overflow-hidden">
                    <div
                        className="h-full bg-teal-600 transition-all duration-300"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>

                {/* STEP 1: TEST SELECTION */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Select Member *</Label>
                                <Select defaultValue="self">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="self">Rajesh Kumar (Self)</SelectItem>
                                        <SelectItem value="spouse">Priya Kumar (Spouse)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Test Category *</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blood">Blood Tests</SelectItem>
                                        <SelectItem value="radiology">Radiology</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2 relative">
                            <Label>Search & Add Tests *</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Type test name (e.g. CBC, Lipid, Sugar)..."
                                    value={testSearch}
                                    onChange={(e) => setTestSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            {filteredTests.length > 0 && (
                                <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                    {filteredTests.map(test => (
                                        <div
                                            key={test.id}
                                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                                            onClick={() => addTest(test)}
                                        >
                                            <span className="text-sm font-medium">{test.name}</span>
                                            <span className="text-xs font-semibold text-teal-600">${test.price}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Tests List */}
                        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-slate-700">Selected Tests ({selectedTests.length})</h4>
                            {selectedTests.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No tests selected yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedTests.map(test => (
                                        <div key={test.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                                <span className="text-sm font-medium text-slate-700">{test.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-bold text-slate-900">${test.price}</span>
                                                <button onClick={() => removeTest(test.id)} className="text-slate-400 hover:text-red-500">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                        <span className="font-semibold text-slate-900">Total Amount</span>
                                        <span className="font-bold text-lg text-teal-700">${totalAmount}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 2: SCHEDULE & LOCATION */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label>Collection Type *</Label>
                            <RadioGroup value={collectionType} onValueChange={setCollectionType} className="grid grid-cols-2 gap-4">
                                <div className="flex items-center space-x-2 rounded-lg border border-slate-200 p-4 [&:has(:checked)]:border-teal-500 [&:has(:checked)]:bg-teal-50">
                                    <RadioGroupItem value="home" id="home" />
                                    <Label htmlFor="home" className="cursor-pointer font-medium">Home Sample Collection</Label>
                                </div>
                                <div className="flex items-center space-x-2 rounded-lg border border-slate-200 p-4 [&:has(:checked)]:border-teal-500 [&:has(:checked)]:bg-teal-50">
                                    <RadioGroupItem value="center" id="center" />
                                    <Label htmlFor="center" className="cursor-pointer font-medium">Visit Diagnostic Center</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Preferred Date *</Label>
                                <Input
                                    type="date"
                                    min={new Date().toISOString().split('T')[0]}
                                    className="block w-full"
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Time Slot *</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Slot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* 8 AM is the start of morning — hide if already past */}
                                        {!isSlotPastWizard(12) && (
                                            <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                                        )}
                                        {!isSlotPastWizard(16) && (
                                            <SelectItem value="afternoon">Afternoon (12PM - 4PM)</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {collectionType === 'home' && (
                            <div className="space-y-3 animate-in fade-in-50">
                                <div className="flex items-center justify-between">
                                    <Label className="text-base">Collection Address *</Label>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="reg-addr" />
                                        <Label htmlFor="reg-addr" className="text-xs font-normal">Use registered address</Label>
                                    </div>
                                </div>
                                <Textarea placeholder="Enter full address..." className="min-h-[80px]" />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Special Instructions (Optional)</Label>
                            <Input placeholder="E.g. Fasting required, hard of hearing..." />
                        </div>
                    </div>
                )}

                {/* STEP 3: REVIEW */}
                {step === 3 && (
                    <div className="space-y-6">
                        <div className="rounded-lg bg-teal-50 border border-teal-100 p-4 flex flex-col items-center justify-center text-center space-y-2">
                            <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center text-teal-600">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <h3 className="font-semibold text-teal-900">Booking Summary</h3>
                            <p className="text-sm text-teal-700">Please review your details before confirming.</p>
                        </div>

                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
                                <div>
                                    <span className="text-slate-500 block">Patient</span>
                                    <span className="font-medium text-slate-900">Rajesh Kumar</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block">Collection Type</span>
                                    <span className="font-medium text-slate-900 capitalize">{collectionType} Collection</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-500 block mb-2">Tests Selected</span>
                                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                    {selectedTests.map(t => (
                                        <li key={t.id}>{t.name}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="pt-2 flex justify-between items-center text-base font-semibold border-t border-slate-100">
                                <span>Total Estimated Cost</span>
                                <span>${totalAmount}</span>
                            </div>
                        </div>

                        <div className="flex items-start space-x-2 pt-4">
                            <Checkbox id="auth" />
                            <Label htmlFor="auth" className="text-xs text-slate-600 leading-tight">
                                I authorize Healthmitra to process this booking. I understand that actual prices may vary slightly based on the lab chosen.
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
                        onClick={step === 3 ? resetAndClose : handleNext}
                        className="w-[120px] bg-teal-600 hover:bg-teal-700"
                        disabled={step === 1 && selectedTests.length === 0}
                    >
                        {step === 3 ? "Confirm Booking" : "Next →"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
