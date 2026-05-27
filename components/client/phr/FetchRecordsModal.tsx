'use client';

import React, { useState } from 'react';
import { X, Search, Building2, Download, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';

interface FetchRecordsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function FetchRecordsModal({ isOpen, onClose }: FetchRecordsModalProps) {
    const [search, setSearch] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [selectedRecords, setSelectedRecords] = useState<string[]>([]); // record IDs
    const [foundRecords, setFoundRecords] = useState<{ id: string; type: string; date: string }[]>([]);

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (!search) return;
        setHasSearched(true);
        // TODO: Integrate with ABDM/ABHA API to fetch real records
        setFoundRecords([]);
    };

    const toggleSelection = (id: string) => {
        if (selectedRecords.includes(id)) {
            setSelectedRecords(selectedRecords.filter(r => r !== id));
        } else {
            setSelectedRecords([...selectedRecords, id]);
        }
    };

    const handleFetch = () => {
        setIsFetching(true);
        setTimeout(() => {
            setIsFetching(false);
            toast.success('Records Fetched Successfully', {
                description: `${selectedRecords.length} documents added to your Health Records.`
            });
            onClose();
            setHasSearched(false);
            setSearch('');
            setSelectedRecords([]);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800">Fetch Medical Records</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-500">Select Hospital / Provider *</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-9 pr-16 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="Search hospital name..."
                            />
                            <button
                                onClick={handleSearch}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded"
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {hasSearched && (
                        <div className="space-y-3 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 p-2 bg-slate-50 rounded-lg">
                                <Building2 size={16} className="text-teal-600" /> Available from Apollo Hospital:
                            </div>

                            <div className="space-y-2">
                                {foundRecords.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-sm">No records found for this provider. Try another hospital.</div>
                                ) : foundRecords.map((rec) => (
                                    <button
                                        key={rec.id}
                                        onClick={() => toggleSelection(rec.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${selectedRecords.includes(rec.id)
                                            ? 'bg-teal-50 border-teal-200 ring-1 ring-teal-200'
                                            : 'bg-white border-slate-100 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={selectedRecords.includes(rec.id) ? 'text-teal-600' : 'text-slate-300 group-hover:text-slate-400'}>
                                            {selectedRecords.includes(rec.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-800">{rec.type}</p>
                                            <p className="text-xs text-slate-500">{rec.date}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleFetch}
                        disabled={isFetching || selectedRecords.length === 0}
                        className="px-6 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFetching ? 'Fetching...' : 'Fetch Selected Records'}
                    </button>
                </div>
            </div>
        </div>
    );
}
