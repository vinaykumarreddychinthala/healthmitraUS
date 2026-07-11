'use client';

import React, { useState } from 'react';
import { Upload, Search, Folder, FileText, MoreVertical, Eye, Shield, User, Stethoscope, TestTube2, FileHeart, Pill, Building2, Download, Share } from 'lucide-react';
import ABDMCard from '@/components/client/phr/ABDMCard';
import UploadDocumentModal from '@/components/client/phr/UploadDocumentModal';
import { toast } from 'sonner';

interface PHRViewProps {
    documents: any[];
}

// NEW CATEGORY STRUCTURE as per client requirements
const PREDEFINED_CATEGORIES = [
    { name: 'All', icon: Folder, color: 'slate' },
    { name: 'Doctor Consultant', icon: Stethoscope, color: 'blue' },
    { name: 'Test Reports', icon: TestTube2, color: 'purple' },
    { name: 'General Records', icon: FileHeart, color: 'pink' },
    { name: 'Medicine', icon: Pill, color: 'green' },
    { name: 'HealthMitra & ABHA', icon: Shield, color: 'teal' },
];

export function PHRView({ documents }: PHRViewProps) {
    const validCategories = PREDEFINED_CATEGORIES.map(c => c.name).filter(n => n !== 'All');
    
    // Normalize categories: any category not in the predefined list becomes "General Records"
    const allDocs = (documents || []).map(doc => {
        let cat = doc.category;
        if (!validCategories.includes(cat)) {
            cat = 'General Records';
        }
        return { ...doc, category: cat };
    });
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    // OTP/ABHA Verification Modal State
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationStep, setVerificationStep] = useState<'abha' | 'otp'>('abha');
    const [abhaId, setAbhaId] = useState('');
    const [otp, setOtp] = useState('');
    const [isVerified, setIsVerified] = useState(false);

    // Calculate folder counts
    const categoryCounts = PREDEFINED_CATEGORIES.map(cat => ({
        ...cat,
        count: cat.name === 'All'
            ? allDocs.length
            : allDocs.filter(d => d.category === cat.name).length
    }));

    // Filter documents
    const filteredDocs = allDocs.filter(doc => {
        if (selectedCategory !== 'All' && doc.category !== selectedCategory) return false;
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            if (!doc.name?.toLowerCase().includes(query) && !doc.category?.toLowerCase().includes(query)) {
                return false;
            }
        }
        return true;
    });

    const handleVerifyABHA = () => {
        if (!abhaId || abhaId.length < 14) {
            toast.error('Please enter a valid 14-digit ABHA ID');
            return;
        }
        setVerificationStep('otp');
        toast.success('OTP sent to your registered mobile number');
    };

    const handleVerifyOTP = () => {
        if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }
        setIsVerified(true);
        setShowVerificationModal(false);
        toast.success('ABHA ID verified successfully!', {
            description: 'Your health records are now linked.'
        });
    };

    const getCategoryIcon = (catName: string) => {
        const cat = PREDEFINED_CATEGORIES.find(c => c.name === catName);
        if (cat) {
            const IconComponent = cat.icon;
            return <IconComponent size={18} />;
        }
        return <FileText size={18} />;
    };

    const getAddedByBadge = (addedBy: string) => {
        switch (addedBy) {
            case 'vendor':
                return <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">By Vendor</span>;
            case 'system':
                return <span className="text-[10px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">System</span>;
            default:
                return <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">Self</span>;
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Personal Health Records</h1>
                    <p className="text-slate-500 text-sm">Organize and access your health documents anytime</p>
                </div>
                <div className="flex gap-2">
                    {!isVerified && (
                        <button
                            onClick={() => setShowVerificationModal(true)}
                            className="border border-teal-200 bg-teal-50 text-teal-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-teal-100 transition-colors flex items-center gap-2"
                        >
                            <Shield size={18} /> Link ABHA ID
                        </button>
                    )}
                    <button
                        onClick={() => setIsUploadOpen(true)}
                        className="bg-teal-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-teal-200 hover:bg-teal-700 transition-colors flex items-center gap-2"
                    >
                        <Upload size={18} /> Upload Document
                    </button>
                </div>
            </div>

            {/* ABHA Card */}
            {isVerified && (
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="font-bold">ABHA ID Verified ✓</p>
                            <p className="text-sm text-teal-100">ID: {abhaId}</p>
                        </div>
                    </div>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">Active</span>
                </div>
            )}

            <ABDMCard />

            {/* Category Folders - NEW CATEGORIES */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {categoryCounts.map((folder) => {
                    const IconComponent = folder.icon;
                    return (
                        <button
                            key={folder.name}
                            onClick={() => setSelectedCategory(folder.name)}
                            className={`p-4 rounded-xl border text-left transition-all ${selectedCategory === folder.name
                                ? 'bg-teal-50 border-teal-200 ring-1 ring-teal-200'
                                : 'bg-white border-slate-200 hover:border-teal-200 hover:bg-slate-50'
                                }`}
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${selectedCategory === folder.name
                                ? 'bg-teal-100 text-teal-700'
                                : folder.color === 'blue' ? 'bg-blue-100 text-blue-600'
                                    : folder.color === 'purple' ? 'bg-purple-100 text-purple-600'
                                        : folder.color === 'pink' ? 'bg-pink-100 text-pink-600'
                                            : folder.color === 'green' ? 'bg-green-100 text-green-600'
                                                : folder.color === 'teal' ? 'bg-teal-100 text-teal-600'
                                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                <IconComponent size={18} />
                            </div>
                            <p className={`font-semibold text-sm truncate ${selectedCategory === folder.name ? 'text-teal-900' : 'text-slate-700'}`}>
                                {folder.name}
                            </p>
                            <p className="text-xs text-slate-400">{folder.count} files</p>
                        </button>
                    );
                })}
            </div>

            {/* Document List */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-800">{selectedCategory === 'All' ? 'All Documents' : selectedCategory}</h3>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search documents..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {filteredDocs.length === 0 ? (
                        <div className="col-span-full py-12 text-center">
                            <div className="text-5xl mb-3">📁</div>
                            <p className="text-slate-600 font-medium">No documents found</p>
                            <p className="text-slate-400 text-sm">Upload documents or change filters</p>
                        </div>
                    ) : (
                        filteredDocs.map((doc) => (
                            <div key={doc.id} className="group relative bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all hover:border-teal-200">
                                <div className="flex items-start gap-3">
                                    <div className="p-3 bg-red-50 text-red-500 rounded-lg">
                                        {getCategoryIcon(doc.category)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-semibold text-slate-800 text-sm truncate pr-6">{doc.name || doc.file_name}</h4>
                                        <p suppressHydrationWarning className="text-xs text-slate-500 mt-0.5">{new Date(doc.uploaded_at || doc.created_at).toLocaleDateString()}</p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">{doc.category || 'Doc'}</span>
                                            {getAddedByBadge(doc.addedBy || 'user')}
                                        </div>
                                    </div>
                                    <button className="text-slate-400 hover:text-slate-600">
                                        <MoreVertical size={16} />
                                    </button>
                                </div>

                                <div className="absolute inset-x-0 bottom-0 p-2 bg-slate-50 border-t border-slate-100 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button className="flex-1 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1">
                                        <Eye size={12} /> View
                                    </button>
                                    <button className="flex-1 py-1.5 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center justify-center gap-1">
                                        <Download size={12} /> Download
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ABHA/OTP Verification Modal */}
            {showVerificationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto bg-teal-100 rounded-full flex items-center justify-center mb-4">
                                <Shield className="w-8 h-8 text-teal-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">
                                {verificationStep === 'abha' ? 'Link Your ABHA ID' : 'Verify OTP'}
                            </h3>
                            <p className="text-slate-500 text-sm mt-1">
                                {verificationStep === 'abha'
                                    ? 'Enter your 14-digit Ayushman Bharat Health Account ID'
                                    : 'Enter the OTP sent to your registered mobile'}
                            </p>
                        </div>

                        {verificationStep === 'abha' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">ABHA ID</label>
                                    <input
                                        type="text"
                                        value={abhaId}
                                        onChange={(e) => setAbhaId(e.target.value.replace(/\D/g, '').slice(0, 14))}
                                        placeholder="XX-XXXX-XXXX-XXXX"
                                        className="w-full mt-1 px-4 py-3 text-center text-lg font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">{abhaId.length}/14 digits</p>
                                </div>
                                <button
                                    onClick={handleVerifyABHA}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
                                >
                                    Send OTP
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-700">Enter OTP</label>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="XXXXXX"
                                        className="w-full mt-1 px-4 py-3 text-center text-2xl font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 tracking-widest"
                                    />
                                </div>
                                <button
                                    onClick={handleVerifyOTP}
                                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors"
                                >
                                    Verify & Link
                                </button>
                                <button
                                    onClick={() => setVerificationStep('abha')}
                                    className="w-full py-2 text-sm text-slate-500 hover:text-teal-600"
                                >
                                    ← Change ABHA ID
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => { setShowVerificationModal(false); setVerificationStep('abha'); }}
                            className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-slate-600"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <UploadDocumentModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
            />
        </div>
    );
}
