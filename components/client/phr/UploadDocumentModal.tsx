'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberId?: string;
    userId?: string;
}

export default function UploadDocumentModal({ isOpen, onClose, memberId, userId }: UploadModalProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [category, setCategory] = useState('Prescriptions');
    const [documentDate, setDocumentDate] = useState('');
    const [selectedMember, setSelectedMember] = useState(memberId || '');
    const [tags, setTags] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast.error('Please select a file to upload');
            return;
        }

        setIsUploading(true);
        try {
            // Step 1: Upload file via server-side API (bypasses storage RLS)
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('bucket', 'documents');
            formData.append('folder', `phr/${category.toLowerCase().replace(/ /g, '_')}`);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const uploadJson = await uploadRes.json();
            if (!uploadJson.success) {
                toast.error('Upload failed: ' + uploadJson.error);
                setIsUploading(false);
                return;
            }

            const publicUrl = uploadJson.data.url;

            // Step 2: Save metadata via server-side API (bypasses phr_documents RLS)
            const metaRes = await fetch('/api/phr/upload-meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    member_id: (selectedMember === 'self' || selectedMember === '') ? null : selectedMember,
                    category,
                    file_url: publicUrl,
                    name: selectedFile.name,
                    file_size: (selectedFile.size / 1024 / 1024).toFixed(2) + ' MB',
                    tags: tags ? tags.split(',').map(t => t.trim()) : [],
                }),
            });

            const metaJson = await metaRes.json();
            if (!metaJson.success) {
                console.error('Metadata save error:', metaJson.error);
                // Don't block on metadata failure — file is already uploaded
            }

            toast.success('Document uploaded successfully');
            setSelectedFile(null);
            setTags('');
            onClose();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Something went wrong');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Upload Health Document</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">Select Category *</label>
                            <select 
                                value={category} 
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option>Prescriptions</option>
                                <option>Bills</option>
                                <option>Test Reports</option>
                                <option>General Records</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500">Document Date *</label>
                            <input 
                                type="date" 
                                value={documentDate}
                                onChange={(e) => setDocumentDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500">Select Member</label>
                        <select 
                            value={selectedMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            <option value="">Select member...</option>
                            <option value="self">Self</option>
                            {memberId && <option value={memberId}>Family Member</option>}
                        </select>
                    </div>

                    <div 
                        className="border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 transition-colors text-center cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        {selectedFile ? (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
                                <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Upload size={20} />
                                </div>
                                <p className="text-sm text-slate-600 font-medium">Drag & drop files here or click to browse</p>
                                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB each</p>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500">Tags (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. cardiologist, chest pain"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={isUploading || !selectedFile}
                        className="px-6 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 flex items-center gap-2 disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isUploading ? 'Uploading...' : 'Upload Documents'}
                    </button>
                </div>
            </div>
        </div>
    );
}
