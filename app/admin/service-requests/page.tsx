'use client';

import { useState, useEffect } from 'react';
import {
    Search, Filter, MoreVertical, CheckCircle, Clock,
    AlertCircle, FileText, User, Phone, Calendar, Loader2,
    Mail, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import Link from 'next/link';

import {
    getAdminServiceRequests,
    assignServiceRequest,
    updateServiceRequestStatus,
    getAgents
} from '@/app/actions/service-requests';
import { ServiceRequest, Agent } from '@/types/service-requests';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    in_progress: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    medium: 'bg-sky-100 text-sky-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, string> = {
    medical_consultation: 'Consultation',
    diagnostic: 'Diagnostic',
    medicine: 'Medicine',
    ambulance: 'Ambulance',
    caretaker: 'Caretaker',
    nursing: 'Nursing',
    other: 'Other',
};

export default function AdminServiceRequestsPage() {
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, pending: 0, assigned: 0, in_progress: 0, completed: 0 });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [agentFilter, setAgentFilter] = useState('all');

    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
    const [selectedAgent, setSelectedAgent] = useState('');

    useEffect(() => {
        const loadAgents = async () => {
            const res = await getAgents();
            if (res.success && res.data) setAgents(res.data);
        };
        loadAgents();
    }, []);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const res = await getAdminServiceRequests({
                query: search,
                status: statusFilter,
                type: typeFilter,
                agentId: agentFilter
            });

            if (res.success && res.data) {
                setRequests(res.data);
                if (res.stats) setStats(res.stats);
            } else {
                toast.error('Failed to load requests');
            }
            setLoading(false);
        };

        const timeout = setTimeout(fetch, 300);
        return () => clearTimeout(timeout);
    }, [search, statusFilter, typeFilter, agentFilter]);

    const handleAssign = async () => {
        if (!selectedRequest || !selectedAgent) return;
        const res = await assignServiceRequest(selectedRequest.id, selectedAgent);
        if (res.success) {
            toast.success(res.message);
            setAssignDialogOpen(false);
            setSelectedRequest(null);
            setSelectedAgent('');
            // Refresh logic could be improved, but triggers effect change potentially if state managed
            // For now, simpler to reload page or re-fetch.
            // Let's re-fetch manually or force update. 
            // Simplest: 
            window.location.reload();
        } else {
            toast.error(res.error || 'Failed to assign');
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        const res = await updateServiceRequestStatus(id, newStatus);
        if (res.success) {
            toast.success('Status updated');
            // Update local state directly for speed
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
        } else {
            toast.error(res.error || 'Failed to update status');
        }
    };

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }) : '—';

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Service Requests
                </h1>
                <p className="text-slate-500 text-sm mt-1">Manage all incoming service requests. Assign agents and track status.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total', value: stats.total, color: 'bg-slate-50 border-slate-200 text-slate-900' },
                    { label: 'Pending', value: stats.pending, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                    { label: 'Assigned', value: stats.assigned, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                    { label: 'In Progress', value: stats.in_progress, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                    { label: 'Completed', value: stats.completed, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                ].map(s => (
                    <div key={s.label} className={`p-4 rounded-xl border ${s.color} shadow-sm`}>
                        <div className="text-2xl font-bold">{s.value}</div>
                        <div className="text-xs uppercase tracking-wider opacity-70">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by name, email, phone..."
                        className="pl-9 bg-white border-slate-200 text-slate-900"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] bg-white border-slate-200 text-slate-700">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[140px] bg-white border-slate-200 text-slate-700">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {Object.entries(TYPE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={agentFilter} onValueChange={setAgentFilter}>
                        <SelectTrigger className="w-[150px] bg-white border-slate-200 text-slate-700">
                            <SelectValue placeholder="Agent" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Agents</SelectItem>
                            {agents.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Report Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                        <Filter className="h-10 w-10 opacity-20 mb-2" />
                        <p>No service requests found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto w-full pb-2">
                        <Table className="min-w-[900px]">
                        <TableHeader>
                            <TableRow className="bg-slate-50 border-slate-200">
                                <TableHead className="text-slate-600 font-semibold">ID</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Customer</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Plan / Policy Holder</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Type</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Status</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Assigned To</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Timing</TableHead>
                                <TableHead className="text-slate-600 font-semibold text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map(req => (
                                <TableRow key={req.id} className="border-slate-100 hover:bg-slate-50/50">
                                    <TableCell className="font-mono text-xs text-slate-500">
                                        {req.requestId}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-800">{req.customerName}</div>
                                        <div className="flex flex-col text-xs text-slate-500">
                                            {req.customerEmail && <span>{req.customerEmail}</span>}
                                            {req.customerContact && <span>{req.customerContact}</span>}
                                        </div>
                                    </TableCell>
                                    {/* Plan + Policy Holder column */}
                                    <TableCell>
                                        {(req.details as any)?.plan_name ? (
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-semibold text-teal-700">
                                                    {(req.details as any).plan_name}
                                                </p>
                                                {(req.details as any)?.policy_holder_name && (
                                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        {(req.details as any).policy_holder_name}
                                                        <span className="text-slate-400">({(req.details as any).policy_holder_relation})</span>
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${PRIORITY_COLORS[req.priority || 'medium']} text-xs`}>
                                            {TYPE_LABELS[req.type] || req.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <select
                                            value={req.status}
                                            onChange={(e) => handleStatusUpdate(req.id, e.target.value)}
                                            className={`px-2 py-1 rounded text-xs font-semibold border-none focus:ring-2 focus:ring-teal-500 cursor-pointer ${STATUS_COLORS[req.status]}`}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </TableCell>
                                    <TableCell>
                                        {req.assignedToName ? (
                                            <div className="flex items-center gap-1 text-sm text-slate-700">
                                                <UserCheck className="h-3.5 w-3.5 text-teal-500" />
                                                {req.assignedToName}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">Unassigned</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-500">
                                        <div>Req: {req.requestedAt?.split(' ')[0]}</div>
                                        {req.assignedAt && <div>Asg: {formatDate(req.assignedAt)}</div>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <Link href={`/admin/service-requests/${req.id}`}>
                                                <Button variant="ghost" size="sm" className="text-teal-600 h-8 px-2">
                                                    View
                                                </Button>
                                            </Link>
                                            {req.status === 'pending' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-blue-600 h-8 px-2"
                                                    onClick={() => { setSelectedRequest(req); setAssignDialogOpen(true); }}
                                                >
                                                    Assign
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>
                )}
            </div>

            {/* Assign Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Service Request</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4 py-2">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                                <p className="font-medium text-slate-800">
                                    {selectedRequest.requestId} — {selectedRequest.customerName}
                                </p>
                                <p className="text-sm text-slate-500">{selectedRequest.description}</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Select Agent</label>
                                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose an agent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {agents.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssign} disabled={!selectedAgent}>
                            Assign Agent
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
