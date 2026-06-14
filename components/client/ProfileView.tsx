'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Camera, Save, CreditCard, Shield, Ruler, Scale, Building2, AlertCircle, Lock, Eye, EyeOff, Upload, CheckCircle, Bell, Globe, Moon, Sun, FileText, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { updateUserProfile, updatePassword } from '@/app/actions/user';
import { createClient } from '@/lib/supabase/client';

interface ProfileViewProps {
    profile: any;
    initialTab?: string;
}

type TabType = 'personal' | 'address' | 'bank' | 'kyc' | 'security' | 'preferences';

const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
    'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
    'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
    'Wisconsin', 'Wyoming'
];

const COUNTRIES = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'India', 'Germany', 'France',
    'Japan', 'China', 'Brazil', 'Mexico', 'South Korea', 'Italy', 'Spain', 'Netherlands',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria', 'Belgium',
    'Portugal', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria', 'Croatia',
    'Greece', 'Turkey', 'Russia', 'Ukraine', 'Israel', 'Saudi Arabia', 'UAE', 'Qatar',
    'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Egypt', 'South Africa', 'Nigeria', 'Kenya',
    'Ghana', 'Ethiopia', 'Tanzania', 'Uganda', 'Rwanda', 'Senegal', 'Morocco', 'Tunisia',
    'Algeria', 'Libya', 'Sudan', 'Pakistan', 'Bangladesh', 'Sri Lanka', 'Nepal', 'Myanmar',
    'Thailand', 'Vietnam', 'Philippines', 'Indonesia', 'Malaysia', 'Singapore', 'New Zealand',
    'Argentina', 'Chile', 'Colombia', 'Peru', 'Venezuela', 'Ecuador', 'Bolivia', 'Paraguay',
    'Uruguay', 'Cuba', 'Jamaica', 'Trinidad and Tobago', 'Other'
];


const InputField = ({ label, name, type = 'text', required = false, disabled = false, placeholder = '', maxLength, icon: Icon, formData, handleChange, errors, isEditing, ...props }: any) => (
    <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            {Icon && <Icon size={14} className="text-slate-400" />}
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={formData[name as keyof typeof formData] as string}
            onChange={handleChange}
            disabled={disabled || !isEditing}
            placeholder={placeholder}
            maxLength={maxLength}
            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all ${errors[name] ? 'border-red-300 focus:ring-red-500' : 'border-slate-200'}`}
            {...props}
        />
        {errors[name] && (
            <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle size={12} /> {errors[name]}
            </p>
        )}
    </div>
);

export default function ProfileView({ profile, initialTab = 'personal' }: ProfileViewProps) {
    const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || 'personal');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    // Local object URLs for files just uploaded this session (for inline preview)
    const [kycPreviews, setKycPreviews] = useState<Record<string, { url: string; name: string; size: string; isPdf: boolean }>>({});

    const [formData, setFormData] = useState({
        // Personal Info
        avatar_url: profile?.avatar_url || '',
        full_name: profile?.full_name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        dob: profile?.dob || '',
        blood_group: profile?.blood_group || '',
        gender: profile?.gender || '',
        height_cm: profile?.height_cm || '',
        weight_kg: profile?.weight_kg || '',
        emergency_contact: profile?.emergency_contact || '',
        // Address
        address_line1: profile?.address_line1 || '',
        address_line2: profile?.address_line2 || '',
        city: profile?.city || '',
        state: profile?.state || '',
        pincode: profile?.pincode || '',
        country: profile?.country || 'United States',
        landmark: profile?.landmark || '',
        // Bank Details
        bank_holder_name: profile?.bank_holder_name || '',
        bank_account_number: profile?.bank_account_number || '',
        bank_confirm_account: profile?.bank_account_number || '',
        bank_ifsc: profile?.bank_ifsc || '',
        bank_name: profile?.bank_name || '',
        bank_branch: profile?.bank_branch || '',
        account_type: profile?.account_type || 'savings',
        // KYC
        aadhaar_number: profile?.aadhaar_number || '',
        pan_number: profile?.pan_number || '',
        // Security
        current_password: '',
        new_password: '',
        confirm_password: '',
        two_factor_enabled: profile?.two_factor_enabled || true,
        // Preferences
        email_service_updates: true,
        email_reimbursement: true,
        email_wallet: true,
        email_renewal: true,
        email_promo: false,
        email_newsletter: false,
        sms_critical: true,
        sms_wallet: true,
        sms_appointments: true,
        sms_promo: false,
        language: 'english',
        theme: 'light',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // Real uploaded documents from PHR
    const [documents, setDocuments] = useState<{
        aadhaar_front: { name: string; size: string; verified: boolean; url?: string } | null;
        aadhaar_back: { name: string; size: string; verified: boolean; url?: string } | null;
        pan_card: { name: string; size: string; verified: boolean; url?: string } | null;
        cancelled_cheque: { name: string; size: string; verified: boolean; url?: string } | null;
    }>({
        aadhaar_front: null,
        aadhaar_back: null,
        pan_card: null,
        cancelled_cheque: null,
    });

    // Real login history - fetch from auth logs or empty
    const [loginHistory, setLoginHistory] = useState<{ device: string; time: string; current: boolean }[]>([]);

    // Load real documents from PHR table
    useEffect(() => {
        const loadDocuments = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: phrDocs } = await supabase
                .from('phr_documents')
                .select('*')
                .eq('user_id', user.id)
                .in('category', ['aadhaar', 'pan', 'bank'])
                .order('created_at', { ascending: false });

            if (phrDocs && phrDocs.length > 0) {
                const docs: typeof documents = { aadhaar_front: null, aadhaar_back: null, pan_card: null, cancelled_cheque: null };
                // Since it's ordered by newest first, we only process the first one of each type
                phrDocs.forEach((doc: any) => {
                    if (doc.category === 'aadhaar' && doc.name?.includes('front') && !docs.aadhaar_front) {
                        docs.aadhaar_front = { name: doc.name || '', size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                    } else if (doc.category === 'aadhaar' && doc.name?.includes('back') && !docs.aadhaar_back) {
                        docs.aadhaar_back = { name: doc.name || '', size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                    } else if (doc.category === 'pan' && !docs.pan_card) {
                        docs.pan_card = { name: doc.name || '', size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                    } else if (doc.category === 'bank' && !docs.cancelled_cheque) {
                        docs.cancelled_cheque = { name: doc.name || '', size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                    }
                });
                setDocuments(docs);
            }
        };
        loadDocuments();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let newValue: string | boolean = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        
        // Auto-uppercase PAN number
        if (name === 'pan_number' && typeof newValue === 'string') {
            newValue = newValue.toUpperCase();
        }
        
        setFormData({ ...formData, [name]: newValue });
        if (errors[name]) {
            setErrors({ ...errors, [name]: '' });
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        // NO COMPULSORY FIELDS - Everything is optional for new users
        // Only validate format if fields are filled (optional validation)

        // Phone validation (only if filled) - accept US/international formats
        const cleanPhone = formData.phone.replace(/[\s\-\+\(\)\.]/g, '');
        if (cleanPhone && (cleanPhone.length < 7 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone))) {
            newErrors.phone = 'Enter a valid phone number (7-15 digits)';
        }


        // Zip/Pincode validation (only if filled) - relaxed for global
        if (formData.pincode && formData.pincode.length < 4) {
            newErrors.pincode = 'Enter a valid zip/postal code';
        }


        // Bank validation (only if filled)
        if (formData.bank_account_number && formData.bank_confirm_account && 
            formData.bank_account_number !== formData.bank_confirm_account) {
            newErrors.bank_confirm_account = 'Account numbers do not match';
        }
        if (formData.bank_ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc.toUpperCase())) {
            newErrors.bank_ifsc = 'Invalid IFSC code';
        }

        // KYC validation (only if filled)
        if (formData.aadhaar_number && !/^\d{12}$/.test(formData.aadhaar_number.replace(/\s/g, ''))) {
            newErrors.aadhaar_number = 'Aadhaar must be 12 digits';
        }
        if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
            newErrors.pan_number = 'Invalid PAN format';
        }

        // Password validation (only if changing password)
        if (formData.new_password && formData.new_password.length < 8) {
            newErrors.new_password = 'Password must be at least 8 characters';
        }
        if (formData.new_password && formData.new_password !== formData.confirm_password) {
            newErrors.confirm_password = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            toast.error('Please fix the errors before saving');
            return;
        }

        setLoading(true);
        try {
            const result = await updateUserProfile(formData);
            if (result.success) {
                toast.success('Profile updated successfully!');
                setIsEditing(false);
            } else {
                toast.error('Failed to update profile', { description: result.error });
            }
        } catch {
            toast.error('Something went wrong while saving');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!formData.current_password) {
            toast.error('Current password is required to change password');
            return;
        }
        if (formData.new_password.length < 8) {
            toast.error('New password must be at least 8 characters');
            return;
        }
        if (formData.new_password !== formData.confirm_password) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const result = await updatePassword(formData.current_password, formData.new_password);
            if (result.success) {
                toast.success('Password updated successfully!');
                setFormData(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
            } else {
                toast.error('Failed to update password', { description: result.error });
            }
        } catch {
            toast.error('Something went wrong while updating password');
        } finally {
            setLoading(false);
        }
    };

    const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string, category: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create a local object URL immediately for inline preview
        const localObjectUrl = URL.createObjectURL(file);
        const fileSizeKb = `${Math.round(file.size / 1024)} KB`;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        toast.info(`Uploading ${type.replace('_', ' ')}...`, { id: 'upload' });
        try {
            // Use server-side upload API to bypass storage RLS
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('bucket', 'documents');
            uploadFormData.append('folder', 'kyc');

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData,
            });

            const uploadJson = await uploadRes.json();
            if (!uploadJson.success) throw new Error(uploadJson.error || 'Upload failed');

            const publicUrl = uploadJson.data.url;

            // Insert metadata via API route to bypass RLS
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const metaRes = await fetch('/api/phr/upload-meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: type,
                    category,
                    file_url: publicUrl,
                    file_size: fileSizeKb,
                }),
            });

            const metaJson = await metaRes.json();
            if (!metaJson.success) throw new Error(metaJson.error || 'Metadata save failed');

            // Store local preview for immediate display
            setKycPreviews(prev => ({
                ...prev,
                [type]: { url: localObjectUrl, name: file.name, size: fileSizeKb, isPdf },
            }));

            toast.success('Document uploaded successfully', { id: 'upload' });

            // Re-fetch documents from DB to update persistent state
            const { data: phrDocs } = await supabase
                .from('phr_documents')
                .select('*')
                .eq('user_id', user.id)
                .in('category', ['aadhaar', 'pan', 'bank'])
                .order('created_at', { ascending: false });

            if (phrDocs) {
                const docs: any = { aadhaar_front: null, aadhaar_back: null, pan_card: null, cancelled_cheque: null };
                phrDocs.forEach((doc: any) => {
                    if (doc.category === 'aadhaar' && doc.name?.includes('front') && !docs.aadhaar_front) docs.aadhaar_front = { name: doc.name, size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                    else if (doc.category === 'aadhaar' && doc.name?.includes('back') && !docs.aadhaar_back) docs.aadhaar_back = { name: doc.name, size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                    else if (doc.category === 'pan' && !docs.pan_card) docs.pan_card = { name: doc.name, size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                    else if (doc.category === 'bank' && !docs.cancelled_cheque) docs.cancelled_cheque = { name: doc.name, size: String(doc.file_size || ''), verified: doc.is_verified || false, url: doc.file_url };
                });
                setDocuments(docs);
            }
        } catch (error: any) {
            // Revoke object URL on failure to avoid memory leak
            URL.revokeObjectURL(localObjectUrl);
            toast.error('Upload failed: ' + error.message, { id: 'upload' });
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.info('Uploading photo...', { id: 'avatar-upload' });
        try {
            const uploadFormData = new FormData();
            uploadFormData.append('file', file);
            uploadFormData.append('bucket', 'avatars');
            uploadFormData.append('folder', 'profiles');

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: uploadFormData,
            });

            const uploadJson = await uploadRes.json();
            if (!uploadJson.success) throw new Error(uploadJson.error || 'Upload failed');

            setFormData(prev => ({ ...prev, avatar_url: uploadJson.data.url }));
            toast.success('Photo uploaded! Click Save Changes to apply.', { id: 'avatar-upload' });
        } catch (error: any) {
            toast.error('Upload failed: ' + error.message, { id: 'avatar-upload' });
        }
    };

    const formatAadhaar = (value: string) => {
        const cleaned = value.replace(/\D/g, '').slice(0, 12);
        const parts = cleaned.match(/.{1,4}/g) || [];
        return parts.join(' ');
    };

    const tabs = [
        { id: 'personal', label: 'Personal Info', icon: User },
        { id: 'address', label: 'Address', icon: MapPin },
        { id: 'bank', label: 'Bank Details', icon: Building2 },
        { id: 'kyc', label: 'KYC', icon: FileText },
        { id: 'security', label: 'Security', icon: Shield },
        // { id: 'preferences', label: 'Preferences', icon: Bell },
    ];

    // InputField moved outside

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
                    <p className="text-slate-500 text-sm">Manage your personal information and settings</p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 w-full sm:w-auto"
                    >
                        <Edit2 size={16} /> Edit Profile
                    </button>
                ) : (
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex-1 sm:flex-none px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
                        >
                            <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Header Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
                <div className="relative">
                    {formData.avatar_url ? (
                        <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden">
                            <img src={formData.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-lg">
                            {(formData.full_name || 'U').charAt(0).toUpperCase()}
                        </div>
                    )}
                    {isEditing && (
                        <div className="absolute -bottom-2 -right-2">
                            <label className="p-2.5 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors shadow-md border-2 border-white cursor-pointer block">
                                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                <Camera size={16} />
                            </label>
                        </div>
                    )}
                </div>
                <div className="text-center md:text-left flex-1">
                    <h2 className="text-xl font-bold text-slate-800">{formData.full_name || 'Guest User'}</h2>
                    <p className="text-slate-500">{formData.email}</p>
                    <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                        <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-100 flex items-center gap-1">
                            <CheckCircle size={12} /> Verified
                        </span>
                        {formData.blood_group && (
                            <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-100">
                                Blood: {formData.blood_group}
                            </span>
                        )}
                        {formData.height_cm && formData.weight_kg && Number(formData.height_cm) > 0 && (
                            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-100">
                                BMI: {(Number(formData.weight_kg) / Math.pow(Number(formData.height_cm) / 100, 2)).toFixed(1)}
                            </span>
                        )}
                    </div>
                </div>
                {isEditing && (
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 w-full md:w-auto mt-2 md:mt-0">
                        <label className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex-1 md:flex-none cursor-pointer text-center block">
                            <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                            Upload Photo
                        </label>
                        {formData.avatar_url && (
                            <button onClick={() => setFormData(prev => ({ ...prev, avatar_url: '' }))} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-1 md:flex-none">
                                Remove
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex overflow-x-auto border-b border-slate-200">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab.id
                                ? 'border-teal-500 text-teal-600 bg-teal-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* TAB 1: Personal Information */}
                    {activeTab === 'personal' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Full Name" name="full_name" placeholder="Enter your full name" icon={User} />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Date of Birth" name="dob" type="date" icon={Calendar} />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Blood Group</label>
                                    <select
                                        name="blood_group"
                                        value={formData.blood_group}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <Phone size={14} className="text-slate-400" /> Mobile Number
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="10-digit mobile"
                                            maxLength={10}
                                            className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed ${errors.phone ? 'border-red-300' : 'border-slate-200'}`}
                                        />
                                        {formData.phone && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs font-medium flex items-center gap-1">
                                                <CheckCircle size={12} /> Verified
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        <Mail size={14} className="text-slate-400" /> Email
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            disabled
                                            className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Height (cm)" name="height_cm" type="number" placeholder="e.g., 175" icon={Ruler} />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Weight (kg)" name="weight_kg" type="number" placeholder="e.g., 72" icon={Scale} />

                                <div className="md:col-span-2">
                                    <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Emergency Contact" name="emergency_contact" type="tel" placeholder="+91 9123456789" icon={Phone} maxLength={10} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Address Details */}
                    {activeTab === 'address' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="text-sm font-semibold text-blue-800">Complete your address for better service</p>
                                    <p className="text-xs text-blue-700 mt-1">All fields are optional but recommended</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing}
                                    label="Address Line 1 (House/Flat No., Building)"
                                    name="address_line1"
                                    placeholder="A-101, Sunrise Apartments"
                                />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing}
                                    label="Address Line 2 (Street/Area)"
                                    name="address_line2"
                                    placeholder="SG Highway, Bodakdev"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="City" name="city" placeholder="e.g., New York" />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">State</label>
                                    {formData.country === 'United States' ? (
                                        <select
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            <option value="">Select State</option>
                                            {US_STATES.map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="e.g., Ontario, Gujarat"
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                        />
                                    )}
                                </div>

                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Zip / Postal Code" name="pincode" placeholder="e.g., 90210" />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Country</label>
                                    <select
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="">Select Country</option>
                                        {COUNTRIES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Landmark" name="landmark" placeholder="Near Star Bazaar" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: Bank Account Details */}
                    {activeTab === 'bank' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                                <Building2 className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                                <p className="text-sm text-blue-800">Add your bank details for wallet withdrawals. All fields are optional.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Account Holder Name" name="bank_holder_name" placeholder="As per bank records" />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Account Number" name="bank_account_number" placeholder="Enter account number" />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Confirm Account Number" name="bank_confirm_account" placeholder="Re-enter account number" />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="IFSC Code" name="bank_ifsc" placeholder="e.g., HDFC0001234" maxLength={11} />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Bank Name" name="bank_name" placeholder="Auto-filled from IFSC" />
                                <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={isEditing} label="Branch Name" name="bank_branch" placeholder="Branch name" />

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700">Account Type</label>
                                    <select
                                        name="account_type"
                                        value={formData.account_type}
                                        onChange={handleChange}
                                        disabled={!isEditing}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        <option value="savings">Savings</option>
                                        <option value="current">Current</option>
                                    </select>
                                </div>
                            </div>

                            {/* Cancelled Cheque Upload */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">Upload Cancelled Cheque or Passbook (For verification)</label>
                                {isEditing ? (
                                    <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors cursor-pointer block">
                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleKycUpload(e, 'cancelled_cheque', 'bank')} />
                                        <Upload className="mx-auto text-slate-400 mb-3" size={32} />
                                        <p className="text-slate-600 font-medium">Drag & drop file here or click to browse</p>
                                        <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 5MB</p>
                                    </label>
                                ) : documents.cancelled_cheque ? (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <FileText className="text-slate-400" size={20} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">{documents.cancelled_cheque.name}</p>
                                                <p className="text-xs text-slate-500">{documents.cancelled_cheque.size}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={() => documents.cancelled_cheque?.url && setPreviewUrl(documents.cancelled_cheque.url)} className="text-teal-600 hover:text-teal-700 bg-teal-50 p-1.5 rounded-md" title="Preview Document">
                                                <Eye size={18} />
                                            </button>
                                            {documents.cancelled_cheque.verified && (
                                                <span className="text-emerald-500 text-xs font-medium flex items-center gap-1">
                                                    <CheckCircle size={12} /> Verified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">No document uploaded</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: KYC Documents */}
                    {activeTab === 'kyc' && (
                        <div className="space-y-6">
                            {/* Aadhaar Section */}
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <CreditCard size={18} className="text-orange-500" /> Aadhaar Card
                                    </h4>
                                    {documents.aadhaar_front && documents.aadhaar_back && (
                                        <span className="text-emerald-500 text-xs font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
                                            <CheckCircle size={12} /> Verified
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Aadhaar Number</label>
                                        <input
                                            type="text"
                                            name="aadhaar_number"
                                            value={formatAadhaar(formData.aadhaar_number)}
                                            onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value.replace(/\s/g, '') })}
                                            disabled={!isEditing}
                                            placeholder="XXXX XXXX 1234"
                                            maxLength={14}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Aadhaar Front */}
                                        <div className="p-4 bg-white rounded-lg border border-slate-200">
                                            <p className="text-xs text-slate-500 mb-2">📄 Front Side</p>
                                            {(() => {
                                                const freshPreview = kycPreviews['aadhaar_front'];
                                                const savedDoc = documents.aadhaar_front;
                                                if (freshPreview) {
                                                    return (
                                                        <div className="space-y-2">
                                                            <div className="relative w-full h-28 bg-slate-100 rounded-lg overflow-hidden border border-emerald-200">
                                                                {freshPreview.isPdf ? (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                                        <FileText size={28} className="text-red-500" />
                                                                        <span className="text-xs text-slate-500">PDF Document</span>
                                                                    </div>
                                                                ) : (
                                                                    <img src={freshPreview.url} alt="Aadhaar Front" className="w-full h-full object-cover" />
                                                                )}
                                                                <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">✓ Uploaded</div>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{freshPreview.name}</p>
                                                                    <p className="text-[10px] text-slate-400">{freshPreview.size}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button type="button" onClick={() => setPreviewUrl(freshPreview.url)} className="text-teal-600 hover:text-teal-700 p-1 bg-teal-50 rounded" title="Preview">
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    {isEditing && (
                                                                        <label className="text-slate-500 hover:text-slate-700 p-1 bg-slate-50 rounded cursor-pointer" title="Re-upload">
                                                                            <Upload size={14} />
                                                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleKycUpload(e, 'aadhaar_front', 'aadhaar')} />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (savedDoc) {
                                                    return (
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm text-slate-700">{savedDoc.name} ({savedDoc.size})</p>
                                                            <div className="flex items-center gap-2">
                                                                <button type="button" onClick={() => savedDoc.url && setPreviewUrl(savedDoc.url)} className="text-teal-600 hover:text-teal-700 p-1" title="Preview Document">
                                                                    <Eye size={16} />
                                                                </button>
                                                                <CheckCircle className="text-emerald-500" size={16} />
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <label className="text-sm text-teal-600 hover:underline cursor-pointer block">
                                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleKycUpload(e, 'aadhaar_front', 'aadhaar')} />
                                                            Upload
                                                        </label>
                                                    );
                                                }
                                            })()}
                                        </div>

                                        {/* Aadhaar Back */}
                                        <div className="p-4 bg-white rounded-lg border border-slate-200">
                                            <p className="text-xs text-slate-500 mb-2">📄 Back Side</p>
                                            {(() => {
                                                const freshPreview = kycPreviews['aadhaar_back'];
                                                const savedDoc = documents.aadhaar_back;
                                                if (freshPreview) {
                                                    return (
                                                        <div className="space-y-2">
                                                            <div className="relative w-full h-28 bg-slate-100 rounded-lg overflow-hidden border border-emerald-200">
                                                                {freshPreview.isPdf ? (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                                        <FileText size={28} className="text-red-500" />
                                                                        <span className="text-xs text-slate-500">PDF Document</span>
                                                                    </div>
                                                                ) : (
                                                                    <img src={freshPreview.url} alt="Aadhaar Back" className="w-full h-full object-cover" />
                                                                )}
                                                                <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">✓ Uploaded</div>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{freshPreview.name}</p>
                                                                    <p className="text-[10px] text-slate-400">{freshPreview.size}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button type="button" onClick={() => setPreviewUrl(freshPreview.url)} className="text-teal-600 hover:text-teal-700 p-1 bg-teal-50 rounded" title="Preview">
                                                                        <Eye size={14} />
                                                                    </button>
                                                                    {isEditing && (
                                                                        <label className="text-slate-500 hover:text-slate-700 p-1 bg-slate-50 rounded cursor-pointer" title="Re-upload">
                                                                            <Upload size={14} />
                                                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleKycUpload(e, 'aadhaar_back', 'aadhaar')} />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (savedDoc) {
                                                    return (
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm text-slate-700">{savedDoc.name} ({savedDoc.size})</p>
                                                            <div className="flex items-center gap-2">
                                                                <button type="button" onClick={() => savedDoc.url && setPreviewUrl(savedDoc.url)} className="text-teal-600 hover:text-teal-700 p-1" title="Preview Document">
                                                                    <Eye size={16} />
                                                                </button>
                                                                <CheckCircle className="text-emerald-500" size={16} />
                                                            </div>
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <label className="text-sm text-teal-600 hover:underline cursor-pointer block">
                                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleKycUpload(e, 'aadhaar_back', 'aadhaar')} />
                                                            Upload
                                                        </label>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PAN Section */}
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <CreditCard size={18} className="text-blue-500" /> PAN Card
                                    </h4>
                                    {documents.pan_card && (
                                        <span className="text-emerald-500 text-xs font-medium flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-full">
                                            <CheckCircle size={12} /> Verified
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">PAN Number</label>
                                        <input
                                            type="text"
                                            name="pan_number"
                                            value={formData.pan_number.toUpperCase()}
                                            onChange={handleChange}
                                            disabled={!isEditing}
                                            placeholder="ABCDE1234F"
                                            maxLength={10}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed uppercase"
                                        />
                                    </div>

                                    <div className="p-4 bg-white rounded-lg border border-slate-200">
                                        <p className="text-xs text-slate-500 mb-2">📄 PAN Card</p>
                                        {(() => {
                                            const freshPreview = kycPreviews['pan_card'];
                                            const savedDoc = documents.pan_card;
                                            if (freshPreview) {
                                                return (
                                                    <div className="space-y-2">
                                                        <div className="relative w-full h-28 bg-slate-100 rounded-lg overflow-hidden border border-emerald-200">
                                                            {freshPreview.isPdf ? (
                                                                <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                                                    <FileText size={28} className="text-red-500" />
                                                                    <span className="text-xs text-slate-500">PDF Document</span>
                                                                </div>
                                                            ) : (
                                                                <img src={freshPreview.url} alt="PAN Card" className="w-full h-full object-cover" />
                                                            )}
                                                            <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">✓ Uploaded</div>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs font-medium text-slate-700 truncate max-w-[200px]">{freshPreview.name}</p>
                                                                <p className="text-[10px] text-slate-400">{freshPreview.size}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <button type="button" onClick={() => setPreviewUrl(freshPreview.url)} className="text-teal-600 hover:text-teal-700 p-1 bg-teal-50 rounded" title="Preview">
                                                                    <Eye size={14} />
                                                                </button>
                                                                {isEditing && (
                                                                    <label className="text-slate-500 hover:text-slate-700 p-1 bg-slate-50 rounded cursor-pointer" title="Re-upload">
                                                                        <Upload size={14} />
                                                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleKycUpload(e, 'pan_card', 'pan')} />
                                                                    </label>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            } else if (savedDoc) {
                                                return (
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm text-slate-700">{savedDoc.name} ({savedDoc.size})</p>
                                                        <div className="flex items-center gap-2">
                                                            <button type="button" onClick={() => savedDoc.url && setPreviewUrl(savedDoc.url)} className="text-teal-600 hover:text-teal-700 p-1" title="Preview Document">
                                                                <Eye size={16} />
                                                            </button>
                                                            <CheckCircle className="text-emerald-500" size={16} />
                                                        </div>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <label className="text-sm text-teal-600 hover:underline cursor-pointer block">
                                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleKycUpload(e, 'pan_card', 'pan')} />
                                                        Upload
                                                    </label>
                                                );
                                            }
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                <p className="text-sm text-amber-800 flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    <strong>⚠️ Aadhaar Card is mandatory for plan purchases and services</strong>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: Security Settings */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            {/* Change Password */}
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Lock size={18} className="text-slate-600" /> Change Password
                                </h4>
                                <div className="space-y-4 max-w-md">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700">Current Password <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="current_password"
                                                value={formData.current_password}
                                                onChange={handleChange}
                                                placeholder="••••••••••••"
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={true} label="New Password" name="new_password" type="password" required placeholder="••••••••••••" />
                                        <InputField formData={formData} handleChange={handleChange} errors={errors} isEditing={true} label="Confirm Password" name="confirm_password" type="password" required placeholder="••••••••••••" />
                                    </div>
                                    <button 
                                        onClick={handleUpdatePassword}
                                        disabled={loading}
                                        className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-medium hover:bg-slate-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </div>

                            {/* 2FA Settings 
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                                        <Smartphone size={18} className="text-purple-600" /> Two-Factor Authentication (2FA)
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm ${formData.two_factor_enabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                                            {formData.two_factor_enabled ? '● Enabled' : '○ Disabled'}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600 flex items-center gap-2">
                                        <CheckCircle size={14} className="text-emerald-500" /> SMS OTP verification enabled for:
                                    </p>
                                    <ul className="ml-6 space-y-1 text-sm text-slate-600">
                                        <li>• Login from new device</li>
                                        <li>• Wallet withdrawals</li>
                                        <li>• Profile changes</li>
                                    </ul>
                                    <button className="mt-3 px-4 py-2 text-sm text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors">
                                        Configure 2FA Settings
                                    </button>
                                </div>
                            </div>
                            */}

                            {/* Login History 
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Globe size={18} className="text-blue-600" /> Login History
                                </h4>
                                <div className="space-y-3">
                                    {loginHistory.map((login, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${login.current ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">{login.device}</p>
                                                    <p className="text-xs text-slate-500">{login.time}</p>
                                                </div>
                                            </div>
                                            {login.current && (
                                                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Current</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button className="mt-4 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                                    Logout All Devices
                                </button>
                            </div>
                            */}
                        </div>
                    )}

                    {/* TAB 6: Preferences 
                    {activeTab === 'preferences' && (
                        <div className="space-y-6">
                            {/* Email Notifications *\/}
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Mail size={18} className="text-blue-600" /> Email Notifications
                                </h4>
                                <div className="space-y-3">
                                    {[
                                        { name: 'email_service_updates', label: 'Service request updates' },
                                        { name: 'email_reimbursement', label: 'Reimbursement status changes' },
                                        { name: 'email_wallet', label: 'Wallet transactions' },
                                        { name: 'email_renewal', label: 'Plan renewal reminders' },
                                        { name: 'email_promo', label: 'Promotional offers' },
                                        { name: 'email_newsletter', label: 'Health tips and newsletters' },
                                    ].map(item => (
                                        <label key={item.name} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name={item.name}
                                                checked={formData[item.name as keyof typeof formData] as boolean}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* SMS Notifications *\/}
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                    <Phone size={18} className="text-green-600" /> SMS Notifications
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 cursor-not-allowed opacity-60">
                                        <input type="checkbox" checked disabled className="w-4 h-4 text-teal-600 rounded" />
                                        <span className="text-sm text-slate-700">Critical updates (cannot disable)</span>
                                    </label>
                                    {[
                                        { name: 'sms_wallet', label: 'Wallet withdrawals' },
                                        { name: 'sms_appointments', label: 'Appointment reminders' },
                                        { name: 'sms_promo', label: 'Promotional messages' },
                                    ].map(item => (
                                        <label key={item.name} className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name={item.name}
                                                checked={formData[item.name as keyof typeof formData] as boolean}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-700">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Language & Theme *\/}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        <Globe size={18} className="text-purple-600" /> Language Preference
                                    </h4>
                                    <select
                                        name="language"
                                        value={formData.language}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    >
                                        <option value="english">English</option>
                                        <option value="hindi">Hindi</option>
                                        <option value="gujarati">Gujarati</option>
                                    </select>
                                </div>

                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                                    <h4 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                        {formData.theme === 'dark' ? <Moon size={18} className="text-slate-600" /> : <Sun size={18} className="text-amber-500" />}
                                        Display Settings
                                    </h4>
                                    <div className="flex gap-3">
                                        {[
                                            { value: 'light', label: 'Light Mode', icon: Sun },
                                            { value: 'dark', label: 'Dark Mode', icon: Moon },
                                            { value: 'auto', label: 'Auto (System)', icon: Globe },
                                        ].map(option => (
                                            <label key={option.value} className="flex-1 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="theme"
                                                    value={option.value}
                                                    checked={formData.theme === option.value}
                                                    onChange={handleChange}
                                                    className="sr-only"
                                                />
                                                <div className={`p-3 text-center rounded-lg border-2 transition-all ${formData.theme === option.value
                                                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                    }`}>
                                                    {option.icon && <option.icon size={18} className="mx-auto mb-1" />}
                                                    <p className="text-xs font-medium">{option.label}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                    */}
                </div>
            </div>
            {/* Document Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-800">Document Preview</h3>
                            <button onClick={() => setPreviewUrl(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-50">
                            {previewUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg border border-slate-200" title="PDF Preview" />
                            ) : (
                                <img src={previewUrl} alt="Document Preview" className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm" />
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200 flex justify-end">
                            <a href={previewUrl} target="_blank" rel="noreferrer" className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium text-sm">
                                Open in New Tab
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
