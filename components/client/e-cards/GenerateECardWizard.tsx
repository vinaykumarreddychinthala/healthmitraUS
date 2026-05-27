'use client';

import React, { useState } from 'react';
import { ECardMember, ECardFormData } from '@/types/ecard';
import { X, ChevronRight, ChevronLeft, Upload, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateECardWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    availableMembers: {
        id: string;
        name: string;
        relation: string;
        age: number;
        hasCard: boolean;
        planName: string;
    }[];
}

// Indian States for dropdown
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh'
];

// Blood groups
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// Extended form data with all mandatory fields
interface ExtendedFormData {
    fullName: string;
    dob: string;
    gender: string;
    bloodGroup: string;
    mobile: string;
    email: string;
    height: string;
    weight: string;
    aadhaarNumber: string;
    panNumber: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    photo: File | null;
}

// Validation errors interface
interface ValidationErrors {
    [key: string]: string;
}

// Input field component with error display
const InputField = ({
    label,
    name,
    type = 'text',
    placeholder = '',
    value,
    onChange,
    maxLength,
    error,
    className = ''
}: {
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    maxLength?: number;
    error?: string;
    className?: string;
}) => (
    <div className={`space-y-1 ${className}`}>
        <label className="text-xs font-semibold text-slate-500">{label} <span className="text-red-500">*</span></label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            maxLength={maxLength}
            placeholder={placeholder}
            className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 ${error ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
        />
        {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={10} /> {error}
            </p>
        )}
    </div>
);

export default function GenerateECardWizard({ isOpen, onClose, onSuccess, availableMembers }: GenerateECardWizardProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [confirmChecked, setConfirmChecked] = useState(false);

    const [formData, setFormData] = useState<ExtendedFormData>({
        fullName: '',
        dob: '',
        gender: '',
        bloodGroup: '',
        mobile: '',
        email: '',
        height: '',
        weight: '',
        aadhaarNumber: '',
        panNumber: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        photo: null
    });

    if (!isOpen) return null;

    // Mask Aadhaar display (XXXX XXXX 1234)
    const maskAadhaar = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 12);
        if (cleaned.length >= 8) {
            return `XXXX XXXX ${cleaned.slice(-4)}`;
        }
        return cleaned;
    };

    // Format Aadhaar input with spaces
    const formatAadhaarInput = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 12);
        const parts = [];
        for (let i = 0; i < cleaned.length; i += 4) {
            parts.push(cleaned.slice(i, i + 4));
        }
        return parts.join(' ');
    };

    // Validation functions
    const validateMobile = (mobile: string) => /^[6-9]\d{9}$/.test(mobile);
    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateAadhaar = (aadhaar: string) => /^\d{12}$/.test(aadhaar.replace(/\s/g, ''));
    const validatePAN = (pan: string) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
    const validatePincode = (pincode: string) => /^[1-9][0-9]{5}$/.test(pincode);
    const validateHeight = (height: string) => {
        const h = Number(height);
        return h >= 50 && h <= 250;
    };
    const validateWeight = (weight: string) => {
        const w = Number(weight);
        return w >= 1 && w <= 200;
    };

    // Validate all form fields
    const validateForm = (): boolean => {
        const newErrors: ValidationErrors = {};

        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.dob) newErrors.dob = 'Date of birth is required';
        if (!formData.gender) newErrors.gender = 'Gender is required';
        if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group is required';

        if (!formData.mobile) {
            newErrors.mobile = 'Mobile number is required';
        } else if (!validateMobile(formData.mobile)) {
            newErrors.mobile = 'Valid 10-digit mobile required';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!validateEmail(formData.email)) {
            newErrors.email = 'Valid email format required';
        }

        if (!formData.height) {
            newErrors.height = 'Height is required';
        } else if (!validateHeight(formData.height)) {
            newErrors.height = 'Height must be 50-250 cm';
        }

        if (!formData.weight) {
            newErrors.weight = 'Weight is required';
        } else if (!validateWeight(formData.weight)) {
            newErrors.weight = 'Weight must be 1-200 kg';
        }

        const cleanAadhaar = formData.aadhaarNumber.replace(/\s/g, '');
        if (!cleanAadhaar) {
            newErrors.aadhaarNumber = 'Aadhaar number is required';
        } else if (!validateAadhaar(cleanAadhaar)) {
            newErrors.aadhaarNumber = 'Valid 12-digit Aadhaar required';
        }

        if (!formData.panNumber) {
            newErrors.panNumber = 'PAN number is required';
        } else if (!validatePAN(formData.panNumber)) {
            newErrors.panNumber = 'Valid PAN format required (ABCDE1234F)';
        }

        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.city.trim()) newErrors.city = 'City is required';
        if (!formData.state) newErrors.state = 'State is required';

        if (!formData.pincode) {
            newErrors.pincode = 'Pincode is required';
        } else if (!validatePincode(formData.pincode)) {
            newErrors.pincode = 'Valid 6-digit pincode required';
        }

        if (!confirmChecked) {
            newErrors.confirm = 'Please confirm details are accurate';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && !selectedMemberId) {
            toast.error('Please select a member');
            return;
        }
        if (step === 2) {
            if (!validateForm()) {
                toast.error('Please fill all mandatory fields correctly');
                return;
            }
        }
        setStep((prev) => (prev < 3 ? prev + 1 : prev) as 1 | 2 | 3);
    };

    const handleBack = () => {
        setStep((prev) => (prev > 1 ? prev - 1 : prev) as 1 | 2 | 3);
    };

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            toast.success('E-Card Generated Successfully!', {
                description: 'Your digital health card is now ready.'
            });
            onSuccess();
            onClose();
        }, 3000);
    };

    const selectedMember = availableMembers.find(m => m.id === selectedMemberId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Generate E-Card</h2>
                        <p className="text-sm text-slate-500">Step {step} of 3: {step === 1 ? 'Select Member' : step === 2 ? 'Member Information' : 'Preview & Generate'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* STEP 1: SELECT MEMBER */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <p className="text-slate-600">Select member from your active plan:</p>

                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 font-medium text-slate-700 text-sm">
                                    Gold Health Plan
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {availableMembers.map(member => (
                                        <div
                                            key={member.id}
                                            onClick={() => !member.hasCard && setSelectedMemberId(member.id)}
                                            className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${member.hasCard ? 'opacity-50 cursor-not-allowed bg-slate-50' :
                                                selectedMemberId === member.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${selectedMemberId === member.id ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                                                    }`}>
                                                    {selectedMemberId === member.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                                </div>
                                                <div>
                                                    <p className={`font-medium ${member.hasCard ? 'text-slate-500' : 'text-slate-800'}`}>
                                                        {member.name} <span className="text-slate-500 text-sm">({member.relation}) - Age {member.age}</span>
                                                    </p>
                                                    {member.hasCard ? (
                                                        <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                                                            <CheckCircle size={12} /> Card Already Generated
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span> Details Pending
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: FILL DETAILS - ALL MANDATORY */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-red-50 text-red-800 text-sm p-3 rounded-lg flex items-start gap-2 border border-red-200">
                                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold">⚠️ All fields are mandatory</p>
                                    <p className="text-xs mt-1">Card cannot be generated without complete information. Details cannot be changed after generation.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Personal Details Section */}
                                <div className="col-span-1 md:col-span-2">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Personal Details</h3>
                                </div>

                                <InputField
                                    label="Full Name"
                                    name="fullName"
                                    value={formData.fullName}
                                    error={errors.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    placeholder={selectedMember?.name || 'Enter full name'}
                                />

                                <InputField
                                    label="Date of Birth"
                                    name="dob"
                                    type="date"
                                    value={formData.dob}
                                    error={errors.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                />

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Gender <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.gender ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                    {errors.gender && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.gender}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Blood Group <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.bloodGroup}
                                        onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.bloodGroup ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                    >
                                        <option value="">Select Blood Group</option>
                                        {BLOOD_GROUPS.map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                    {errors.bloodGroup && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.bloodGroup}</p>}
                                </div>

                                <InputField
                                    label="Mobile Number"
                                    name="mobile"
                                    type="tel"
                                    value={formData.mobile}
                                    error={errors.mobile}
                                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                    placeholder="+91 9876543210"
                                    maxLength={10}
                                />

                                <InputField
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    error={errors.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="priya@email.com"
                                />

                                {/* Health Info Section */}
                                <div className="col-span-1 md:col-span-2 pt-2">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Health Information</h3>
                                </div>

                                <InputField
                                    label="Height (cm)"
                                    name="height"
                                    type="number"
                                    value={formData.height}
                                    error={errors.height}
                                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                    placeholder="165"
                                />

                                <InputField
                                    label="Weight (kg)"
                                    name="weight"
                                    type="number"
                                    value={formData.weight}
                                    error={errors.weight}
                                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                    placeholder="58"
                                />

                                {/* ID Documents Section */}
                                <div className="col-span-1 md:col-span-2 pt-2">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Identity Documents</h3>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Aadhaar Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formatAadhaarInput(formData.aadhaarNumber)}
                                        onChange={(e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                                        placeholder="XXXX XXXX 1234"
                                        maxLength={14}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono ${errors.aadhaarNumber ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                    />
                                    {errors.aadhaarNumber && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.aadhaarNumber}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">PAN Number <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.panNumber.toUpperCase()}
                                        onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase().slice(0, 10) })}
                                        placeholder="ABCDE1234F"
                                        maxLength={10}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono uppercase ${errors.panNumber ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                    />
                                    {errors.panNumber && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.panNumber}</p>}
                                </div>

                                {/* Address Section */}
                                <div className="col-span-1 md:col-span-2 pt-2">
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Address Details</h3>
                                </div>

                                <div className="col-span-1 md:col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">Address <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="House/Flat No., Building Name, Street/Area"
                                        rows={2}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${errors.address ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                    />
                                    {errors.address && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.address}</p>}
                                </div>

                                <InputField
                                    label="City"
                                    name="city"
                                    value={formData.city}
                                    error={errors.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="Ahmedabad"
                                />

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-500">State <span className="text-red-500">*</span></label>
                                    <select
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.state ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                            }`}
                                    >
                                        <option value="">Select State</option>
                                        {INDIAN_STATES.map(state => (
                                            <option key={state} value={state}>{state}</option>
                                        ))}
                                    </select>
                                    {errors.state && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={10} /> {errors.state}</p>}
                                </div>

                                <InputField
                                    label="Pincode"
                                    name="pincode"
                                    type="text"
                                    value={formData.pincode}
                                    error={errors.pincode}
                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                    placeholder="380001"
                                    maxLength={6}
                                />

                                {/* Photo Upload */}
                                <div className="col-span-1 md:col-span-2 pt-2">
                                    <label className="block p-6 border-2 border-dashed border-slate-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors cursor-pointer text-center">
                                        <Upload className="mx-auto h-8 w-8 text-slate-400" />
                                        <span className="mt-2 block text-sm font-medium text-slate-600">Click to upload photo (Optional)</span>
                                        <span className="mt-1 block text-xs text-slate-400">Passport size, Max 2MB, JPG/PNG</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setFormData({ ...formData, photo: e.target.files?.[0] || null })} />
                                    </label>
                                </div>

                                <div className="col-span-1 md:col-span-2 flex items-start gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="confirm"
                                        checked={confirmChecked}
                                        onChange={(e) => setConfirmChecked(e.target.checked)}
                                        className="rounded text-teal-600 focus:ring-teal-500 mt-1"
                                    />
                                    <label htmlFor="confirm" className={`text-sm ${errors.confirm ? 'text-red-600' : 'text-slate-600'}`}>
                                        I confirm all details are accurate and complete. I understand that details cannot be changed after card generation.
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-center">
                                <h3 className="font-bold text-teal-800 text-lg mb-1">Preview E-Card</h3>
                                <p className="text-teal-600 text-sm">Review details before generating</p>
                            </div>

                            {/* Preview Card */}
                            <div className="w-full max-w-sm mx-auto bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl shadow-xl p-6 text-white relative overflow-hidden">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-sm">HEALTHMITRA</h3>
                                    </div>
                                    <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">PREVIEW</span>
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <div className="w-14 h-16 bg-white/20 rounded-lg flex items-center justify-center text-xl">👤</div>
                                    <div>
                                        <h4 className="font-bold uppercase">{formData.fullName || selectedMember?.name}</h4>
                                        <p className="text-[10px] opacity-80 mt-1">ID: HM-2025-XXX-XXX</p>
                                        <p className="text-[10px] opacity-80">DOB: {formData.dob}</p>
                                        <p className="text-[10px] opacity-80">Plan: {selectedMember?.planName}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details Summary */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm">
                                <p className="font-bold text-slate-700 mb-3">Details Summary:</p>
                                <div className="grid grid-cols-2 gap-2 text-slate-600">
                                    <p>Mobile: <span className="font-medium">{formData.mobile}</span></p>
                                    <p>Blood: <span className="font-medium">{formData.bloodGroup}</span></p>
                                    <p>City: <span className="font-medium">{formData.city}</span></p>
                                    <p>State: <span className="font-medium">{formData.state}</span></p>
                                    <p>Aadhaar: <span className="font-medium font-mono">{maskAadhaar(formData.aadhaarNumber)}</span></p>
                                    <p>PAN: <span className="font-medium font-mono">{formData.panNumber}</span></p>
                                </div>
                            </div>

                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-sm space-y-2">
                                <p className="font-bold text-amber-700">⚠️ Important Notice:</p>
                                <ul className="list-disc list-inside text-amber-600 space-y-1">
                                    <li>Member details will be LOCKED after card generation</li>
                                    <li>Card will be valid for 1 year from issue date</li>
                                </ul>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="bg-white p-6 border-t border-slate-100 flex justify-between items-center flex-shrink-0">
                    {step > 1 ? (
                        <button onClick={handleBack} className="text-slate-500 font-medium hover:text-slate-800 transition-colors flex items-center gap-1">
                            <ChevronLeft size={16} /> Back
                        </button>
                    ) : (
                        <button onClick={onClose} className="text-slate-500 font-medium hover:text-slate-800 transition-colors">
                            Cancel
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            onClick={handleNext}
                            disabled={step === 1 && !selectedMemberId}
                            className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium shadow-md shadow-teal-200 transition-all flex items-center gap-2"
                        >
                            Next Step <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-md shadow-teal-200 transition-all flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Generating...
                                </>
                            ) : (
                                <>Save & Generate Card <CheckCircle size={16} /></>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
