'use client';

import { useState, useEffect, Fragment } from 'react';
import { User, UserType } from '@/types/user';
import { getUsers, toggleUserStatus, getDepartments } from '@/app/actions/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Filter, Loader2, Download, MoreHorizontal, UserCheck, UserX, Mail, Eye, Edit2, Phone, Clock, ChevronDown, ChevronUp, Activity, ShieldCheck, TrendingUp, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';

export default function UsersListingPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [query, setQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [stats, setStats] = useState({ total: 0, customers: 0, employees: 0, admins: 0, partners: 0, potential: 0 });
    const [departments, setDepartments] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [verifyCountFilter, setVerifyCountFilter] = useState('all');

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'users',
                    filters: {
                        role: activeTab === 'all' ? undefined : activeTab === 'customers' ? 'Customer' : activeTab === 'employees' ? 'Employee' : activeTab === 'admins' ? 'Admin' : activeTab === 'partners' ? 'Referral Partner' : undefined
                    }
                }),
            });

            const result = await response.json();

            if (result.success) {
                const blob = new Blob([result.data.csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = result.data.filename || 'users.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
                toast.success('Export completed');
            } else {
                toast.error(result.error || 'Export failed');
            }
        } catch (error) {
            toast.error('Something went wrong');
        } finally {
            setExporting(false);
        }
    };

    // Load data
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Load depts if empty
                if (departments.length === 0) {
                    const depts = await getDepartments();
                    if (depts.success && depts.data) setDepartments(depts.data);
                }

                if (activeTab === 'potential') {
                    const res = await fetch(`/api/admin/potential-customers?q=${encodeURIComponent(query)}&verify_count=${verifyCountFilter}`);
                    const data = await res.json();
                    if (data.success) {
                        setLeads(data.data || []);
                        setStats(prev => ({
                            ...prev,
                            potential: data.total || 0
                        }));
                    } else {
                        toast.error(data.error || 'Failed to load potential customers');
                    }
                } else {
                    // Map generic tab names to specific user types for filtering
                    // All -> 'all', Customers -> 'Customer', etc.
                    const typeFilter =
                        activeTab === 'customers' ? 'Customer' :
                            activeTab === 'employees' ? 'Employee' :
                                activeTab === 'admins' ? 'Admin' :
                                    activeTab === 'partners' ? 'Referral Partner' : 'all';

                    const res = await getUsers({
                        query,
                        type: typeFilter,
                        department: deptFilter
                    });

                    if (res.success && res.data) {
                        setUsers(res.data);
                        if (res.stats) {
                            setStats({
                                total: res.stats.total || 0,
                                customers: res.stats.customers || 0,
                                employees: res.stats.employees || 0,
                                admins: res.stats.admins || 0,
                                partners: res.stats.partners || 0,
                                potential: (res.stats as any).potential || 0
                            });
                        }
                    }
                }
            } catch (err) {
                toast.error("Failed to fetch users");
            } finally {
                setLoading(false);
            }
        };

        const timeout = setTimeout(load, 300); // debounce
        return () => clearTimeout(timeout);
    }, [activeTab, query, deptFilter, verifyCountFilter]);

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        // Optimistic update
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus as any } : u));

        const res = await toggleUserStatus(id, newStatus);
        if (res.success) {
            toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
        } else {
            // Revert on failure
            setUsers(prev => prev.map(u => u.id === id ? { ...u, status: currentStatus as any } : u));
            toast.error(res.error || "Failed to update status");
        }
    };

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

    return (
        <div className="space-y-6 animate-in fade-in py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        User Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all roles and permissions across the platform.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <Button variant="outline" className="border-teal-600 text-teal-400 hover:bg-teal-900/10 w-full sm:w-auto" onClick={handleExport} disabled={exporting}>
                        {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
                        {exporting ? 'Exporting...' : 'Export'}
                    </Button>
                    <Link href="/admin/users/new" className="w-full sm:w-auto">
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Add User
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Info Banner for Potential Customers */}
            {activeTab === 'potential' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50/50 border border-amber-200/60 rounded-2xl text-sm text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Activity className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <p className="font-semibold text-amber-900">How to use this list</p>
                        <p className="mt-0.5 text-amber-700/90">These are users who verified their email but didn&apos;t complete a plan purchase. Contact them directly to assist them with account setup and checkout. Once they buy, they&apos;ll automatically disappear from this list.</p>
                    </div>
                </div>
            )}

            {/* Tabs & Filters */}
            <div className="space-y-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="overflow-x-auto w-full pb-2">
                        <TabsList className="bg-white text-slate-500 border border-slate-200 inline-flex min-w-max">
                        <TabsTrigger value="all" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">All Users ({stats.total})</TabsTrigger>
                        <TabsTrigger value="customers" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">Customers ({stats.customers})</TabsTrigger>
                        <TabsTrigger value="potential" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">Potential Customers ({stats.potential || 0})</TabsTrigger>
                        <TabsTrigger value="employees" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">Employees ({stats.employees})</TabsTrigger>
                        <TabsTrigger value="admins" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">Admins ({stats.admins})</TabsTrigger>
                        <TabsTrigger value="partners" className="data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700">Partners ({stats.partners})</TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>

                <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder={activeTab === 'potential' ? "Search by Name, Email or Phone..." : "Search by Name, Email, Phone or User ID..."}
                            className="pl-9 bg-white border-slate-200 text-slate-900"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    {/* Department Filter - Only show for non-potential customers context */}
                    {activeTab !== 'potential' && (
                        <div className="w-full md:w-64">
                            <Select value={deptFilter} onValueChange={setDeptFilter}>
                                <SelectTrigger className="bg-white border-slate-200 text-slate-700">
                                    <SelectValue placeholder="Department" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 text-slate-700">
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    {/* Verifications Count Filter - Only show for potential customers context */}
                    {activeTab === 'potential' && (
                        <div className="w-full md:w-64">
                            <Select value={verifyCountFilter} onValueChange={setVerifyCountFilter}>
                                <SelectTrigger className="bg-white border-slate-200 text-slate-700">
                                    <SelectValue placeholder="Verifications" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 text-slate-700">
                                    <SelectItem value="all">All Leads</SelectItem>
                                    <SelectItem value="gt_2">More than 2 verifications</SelectItem>
                                    <SelectItem value="gt_5">More than 5 verifications</SelectItem>
                                    <SelectItem value="gt_10">More than 10 verifications</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-0 overflow-x-auto w-full">
                    <Table className="min-w-[800px]">
                        <TableHeader className="bg-slate-50">
                            {activeTab === 'potential' ? (
                                <TableRow className="border-slate-200 hover:bg-transparent">
                                    <TableHead className="text-slate-700">Contact</TableHead>
                                    <TableHead className="text-slate-700">Interested In</TableHead>
                                    <TableHead className="text-slate-700">Verifications</TableHead>
                                    <TableHead className="text-slate-700">First Seen</TableHead>
                                    <TableHead className="text-slate-700">Last Seen</TableHead>
                                    <TableHead className="text-slate-700">Actions</TableHead>
                                </TableRow>
                            ) : (
                                <TableRow className="border-slate-200 hover:bg-transparent">
                                    <TableHead className="w-[80px] text-slate-700">Photo</TableHead>
                                    <TableHead className="text-slate-700">User ID</TableHead>
                                    <TableHead className="text-slate-700">Name / Email</TableHead>
                                    <TableHead className="text-slate-700">Role</TableHead>
                                    <TableHead className="text-slate-700">Info</TableHead>
                                    <TableHead className="text-slate-700">Status</TableHead>
                                    <TableHead className="text-right text-slate-700">Actions</TableHead>
                                </TableRow>
                            )}
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={activeTab === 'potential' ? 6 : 7} className="h-32 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600 mb-2" />
                                        <span className="text-slate-500">Loading details...</span>
                                    </TableCell>
                                </TableRow>
                            ) : activeTab === 'potential' ? (
                                leads.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                                            🎉 No unconverted leads! All verified users have purchased a plan.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    leads.map(lead => (
                                        <Fragment key={lead.id}>
                                            <TableRow
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
                                                                className="hover:text-teal-600 hover:underline"
                                                            >
                                                                {lead.email}
                                                            </button>
                                                        </div>
                                                        {lead.phone && (
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                <Phone className="h-3 w-3" />
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); copyToClipboard(lead.phone!, 'Phone'); }}
                                                                    className="hover:text-teal-600 hover:underline"
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
                                                            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-300 transition-colors"
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
                                                                {(lead.verify_log || []).map((log: any, idx: number) => (
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
                                        </Fragment>
                                    ))
                                )
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                        No users found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map(user => (
                                    <TableRow key={user.id} className="border-slate-100 hover:bg-slate-50">
                                        <TableCell>
                                            <Avatar className="h-10 w-10 border border-slate-200">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} />
                                                <AvatarFallback className="bg-slate-100 text-slate-500">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-slate-500">{user.id}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">{user.name}</span>
                                                <span className="text-xs text-slate-500">{user.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`
                                                ${user.type === 'Admin' ? 'text-purple-600 border-purple-200 bg-purple-50' :
                                                    user.type === 'Employee' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                                                        user.type === 'Customer' ? 'text-teal-600 border-teal-200 bg-teal-50' :
                                                            'text-amber-600 border-amber-200 bg-amber-50'}
                                            `}>
                                                {user.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.type === 'Employee' ? (
                                                <div className="flex flex-col text-xs text-slate-500">
                                                    <span>{departments.find((d: any) => d.id === user.departmentId)?.name || '-'}</span>
                                                    <span className="text-slate-400">Joined: {user.joinedDate}</span>
                                                </div>
                                            ) : user.type === 'Referral Partner' ? (
                                                <div className="flex flex-col text-xs text-amber-600">
                                                    <span>Ref: {(user as any).referralCode || '-'}</span>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-500">{user.city || '-'}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${user.status === 'active' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                                {user.status === 'active' ? 'Active' : 'Inactive'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-white border-slate-200 text-slate-700">
                                                    <DropdownMenuItem className="hover:bg-slate-50 focus:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/admin/users/${user.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Profile
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="hover:bg-slate-50 focus:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/admin/users/${user.id}`}>
                                                        <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="hover:bg-slate-50 focus:bg-slate-50 cursor-pointer" onClick={() => toast.success('Email sent', { description: `Notification email sent to ${user.email}` })}>
                                                        <Mail className="mr-2 h-4 w-4" /> Send Email
                                                    </DropdownMenuItem>

                                                    <DropdownMenuItem
                                                        className={`hover:bg-slate-50 focus:bg-slate-50 cursor-pointer ${user.status === 'active' ? 'text-red-600' : 'text-green-600'}`}
                                                        onClick={() => handleStatusToggle(user.id, user.status)}
                                                    >
                                                        {user.status === 'active' ? (
                                                            <> <UserX className="mr-2 h-4 w-4" /> Deactivate </>
                                                        ) : (
                                                            <> <UserCheck className="mr-2 h-4 w-4" /> Activate </>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
