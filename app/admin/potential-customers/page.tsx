'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    Search, Loader2, RefreshCw, Users, Mail, Phone,
    Clock, ChevronDown, ChevronUp, Activity, ShieldCheck,
    TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface OtpVerification {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    plan_id: string | null;
    plan_name: string | null;
    verify_count: number;
    first_seen_at: string;
    last_seen_at: string;
    verify_log: Array<{ verified_at: string; plan_id: string | null; plan_name: string | null }>;
    converted: boolean;
}

export default function PotentialCustomersPage() {
    const [leads, setLeads] = useState<OtpVerification[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [total, setTotal] = useState(0);
    const [selected, setSelected] = useState<OtpVerification | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const load = useCallback(async (q = query) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/potential-customers?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data.success) { setLeads(data.data); setTotal(data.total); }
            else toast.error(data.error || 'Failed to load');
        } finally { setLoading(false); }
    }, [query]);

    useEffect(() => {
        const t = setTimeout(() => load(), 300);
        return () => clearTimeout(t);
    }, [query, load]);

    const toggleRow = (id: string) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    const uniquePlans = Array.from(new Set(leads.map(l => l.plan_name).filter(Boolean)));

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                        Potential Customers
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Users who verified OTP but haven&apos;t purchased a plan yet. Contact them to help convert.
                    </p>
                </div>
                <Button variant="outline" onClick={() => load()} className="border-slate-200 gap-2 shrink-0">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Leads', value: total, icon: Users, color: 'amber' },
                    { label: 'Verified Once', value: leads.filter(l => l.verify_count === 1).length, icon: ShieldCheck, color: 'blue' },
                    { label: 'Verified 2+ Times', value: leads.filter(l => l.verify_count >= 2).length, icon: TrendingUp, color: 'orange' },
                    { label: 'Unique Plans Viewed', value: uniquePlans.length, icon: Activity, color: 'teal' },
                ].map(stat => (
                    <Card key={stat.label} className="border-slate-200 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center shrink-0`}>
                                <stat.icon className={`h-5 w-5 text-${stat.color}-600`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                                <p className="text-xs text-slate-500">{stat.label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by name, email or phone..."
                    className="pl-9 bg-white border-slate-200"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
            </div>

            {/* Info Banner */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                <Activity className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                    <p className="font-semibold">How to use this list</p>
                    <p className="mt-0.5 text-amber-700">These are users who started the plan purchase flow and verified their email, but didn't complete payment. Contact them directly by email or phone to answer questions and help them complete their purchase. Once they buy, they'll automatically disappear from this list.</p>
                </div>
            </div>

            {/* Table */}
            <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="border-slate-200 hover:bg-transparent">
                                <TableHead className="text-slate-700">Contact</TableHead>
                                <TableHead className="text-slate-700">Interested In</TableHead>
                                <TableHead className="text-slate-700">Verifications</TableHead>
                                <TableHead className="text-slate-700">First Seen</TableHead>
                                <TableHead className="text-slate-700">Last Seen</TableHead>
                                <TableHead className="text-slate-700">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500 mb-2" />
                                        <span className="text-slate-500">Loading leads...</span>
                                    </TableCell>
                                </TableRow>
                            ) : leads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                        🎉 No unconverted leads! All verified users have purchased a plan.
                                    </TableCell>
                                </TableRow>
                            ) : leads.map(lead => (
                                <>
                                    <TableRow
                                        key={lead.id}
                                        className="border-slate-100 hover:bg-slate-50 cursor-pointer"
                                        onClick={() => toggleRow(lead.id)}
                                    >
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-medium text-slate-900 text-sm">{lead.name || <span className="text-slate-400 italic">No name</span>}</p>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Mail className="h-3 w-3" />
                                                    <button
                                                        onClick={e => { e.stopPropagation(); copyToClipboard(lead.email, 'Email'); }}
                                                        className="hover:text-primary hover:underline"
                                                    >
                                                        {lead.email}
                                                    </button>
                                                </div>
                                                {lead.phone && (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                        <Phone className="h-3 w-3" />
                                                        <button
                                                            onClick={e => { e.stopPropagation(); copyToClipboard(lead.phone!, 'Phone'); }}
                                                            className="hover:text-primary hover:underline"
                                                        >
                                                            {lead.phone}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {lead.plan_name ? (
                                                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                                                    {lead.plan_name}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Unknown</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${lead.verify_count >= 3 ? 'text-orange-600' : lead.verify_count >= 2 ? 'text-amber-600' : 'text-slate-700'}`}>
                                                    {lead.verify_count}×
                                                </span>
                                                {lead.verify_count >= 3 && (
                                                    <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">Hot Lead</Badge>
                                                )}
                                                {lead.verify_count === 2 && (
                                                    <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Warm</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {formatDistanceToNow(new Date(lead.first_seen_at), { addSuffix: true })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs text-slate-700 font-medium">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-slate-400" />
                                                {formatDistanceToNow(new Date(lead.last_seen_at), { addSuffix: true })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <a
                                                    href={`mailto:${lead.email}`}
                                                    onClick={e => e.stopPropagation()}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 transition-colors"
                                                    title="Send email"
                                                >
                                                    <Mail className="h-4 w-4" />
                                                </a>
                                                {lead.phone && (
                                                    <a
                                                        href={`tel:${lead.phone}`}
                                                        onClick={e => e.stopPropagation()}
                                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors"
                                                        title="Call"
                                                    >
                                                        <Phone className="h-4 w-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={e => { e.stopPropagation(); toggleRow(lead.id); }}
                                                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                                                    title="View history"
                                                >
                                                    {expandedRows.has(lead.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {/* Expanded row — verification history */}
                                    {expandedRows.has(lead.id) && (
                                        <TableRow key={`${lead.id}-expanded`} className="bg-slate-50/80">
                                            <TableCell colSpan={6} className="py-3 px-6">
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Verification History</p>
                                                    <div className="space-y-1.5">
                                                        {(lead.verify_log || []).map((log, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 text-xs text-slate-600">
                                                                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                                    <span className="text-amber-700 font-bold">{idx + 1}</span>
                                                                </div>
                                                                <span className="text-slate-500">
                                                                    {format(new Date(log.verified_at), 'MMM d, yyyy — h:mm a')}
                                                                </span>
                                                                {log.plan_name && (
                                                                    <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                                                                        {log.plan_name}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
