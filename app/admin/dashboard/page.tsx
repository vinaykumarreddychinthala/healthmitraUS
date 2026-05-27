'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
    Users, CreditCard, Activity, ShoppingCart, Plus, Loader2, 
    TrendingUp, TrendingDown, FileText, DollarSign, UserCheck,
    Clock, CheckCircle, XCircle, AlertCircle, Shield, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { createUser } from '@/app/actions/users';
import { getAdminDashboardData } from '@/app/actions/admin-dashboard';
import Link from 'next/link';

interface DashboardData {
    metrics: {
        totalRevenue: number;
        activePlans: number;
        newCustomers: number;
        pendingTasks: number;
        totalMembers: number;
        activeMembers: number;
        pendingClaims: number;
        activeFranchises: number;
        totalPlans: number;
        pendingRequests: number;
    };
    activities: Array<{
        id: string;
        user: string;
        action: string;
        time: string;
        details: string;
    }>;
    planSales: Array<{ name: string; value: number }>;
    revenueChart: Array<{ name: string; revenue: number }>;
    customerGrowth: Array<{ name: string; customers: number }>;
}

const getRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
};

const MetricCard = ({ title, value, subtitle, icon: Icon, color, href }: any) => (
    <Link href={href || '#'}>
        <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
                        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                    </div>
                    <div className={`p-2.5 rounded-lg ${color}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    </Link>
);

export default function AdminDashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const [newUser, setNewUser] = useState({ full_name: '', email: '', phone: '', role: 'user', password: '' });

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await getAdminDashboardData();
            if (result.success && result.data) {
                setData({
                    ...result.data,
                    activities: result.data.activities.map((a: any) => ({
                        ...a,
                        time: getRelativeTime(a.time)
                    }))
                } as DashboardData);
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    const handleCreateUser = async () => {
        if (!newUser.full_name || !newUser.email || !newUser.password) {
            toast.error('Please fill in all required fields');
            return;
        }
        
        setCreatingUser(true);
        
        // Map roles correctly for UserType
        let userType = 'Customer';
        if (newUser.role === 'admin') userType = 'Admin';
        if (newUser.role === 'employee') userType = 'Employee';
        
        const res = await createUser({
            name: newUser.full_name,
            email: newUser.email,
            phone: newUser.phone,
            type: userType as any,
        });

        if (!res.success) {
            toast.error(res.error || 'Failed to create user');
        } else {
            toast.success('User created successfully!');
            setIsUserModalOpen(false);
            setNewUser({ full_name: '', email: '', phone: '', role: 'user', password: '' });
            loadDashboardData(); // Refresh the list
        }
        setCreatingUser(false);
    };

    const formatCurrency = (amount: number) => {
        if (amount >= 10000000) return `$${(amount / 10000000).toFixed(2)}Cr`;
        if (amount >= 100000) return `$${(amount / 100000).toFixed(2)}L`;
        if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
        return `$${amount}`;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                    <p className="text-slate-500">Welcome back! Here's what's happening today.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsUserModalOpen(true)} className="bg-teal-600 hover:bg-teal-700">
                        <Plus className="mr-2 h-4 w-4" /> Add User
                    </Button>
                    <Button variant="outline" onClick={loadDashboardData} className="bg-white border-slate-200 text-slate-700">
                        <Loader2 className="mr-2 h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            {/* Create User Modal */}
            <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                <DialogContent className="bg-white border-slate-200 text-slate-900 max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Full Name *</Label>
                            <Input id="full_name" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} placeholder="Enter full name" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email *</Label>
                            <Input id="email" type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="Enter email address" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input id="phone" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="Enter phone number" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="agent">Call Centre Agent</SelectItem>
                                    <SelectItem value="employee">Employee</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <Input id="password" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="Enter password" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsUserModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateUser} disabled={creatingUser} className="bg-teal-600 hover:bg-teal-700">
                            {creatingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PRIMARY METRICS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    title="Total Revenue" 
                    value={formatCurrency(data?.metrics?.totalRevenue || 0)} 
                    subtitle="From all payments"
                    icon={DollarSign} 
                    color="bg-emerald-100 text-emerald-600"
                    href="/admin/reimbursements"
                />
                <MetricCard 
                    title="Active Members" 
                    value={data?.metrics?.activeMembers || 0} 
                    subtitle={`of ${data?.metrics?.totalMembers || 0} total`}
                    icon={UserCheck} 
                    color="bg-teal-100 text-teal-600"
                    href="/admin/users"
                />
                <MetricCard 
                    title="Pending Requests" 
                    value={data?.metrics?.pendingRequests || 0} 
                    subtitle="Awaiting action"
                    icon={Clock} 
                    color="bg-amber-100 text-amber-600"
                    href="/admin/service-requests"
                />
                <MetricCard 
                    title="Pending Claims" 
                    value={data?.metrics?.pendingClaims || 0} 
                    subtitle="Reimbursement claims"
                    icon={FileText} 
                    color="bg-rose-100 text-rose-600"
                    href="/admin/reimbursements"
                />
            </div>

            {/* SECONDARY METRICS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    title="Total Customers" 
                    value={data?.metrics?.newCustomers || 0} 
                    subtitle="Registered users"
                    icon={Users} 
                    color="bg-blue-100 text-blue-600"
                    href="/admin/users"
                />
                <MetricCard 
                    title="Active Plans" 
                    value={data?.metrics?.totalPlans || 0} 
                    subtitle="Available plans"
                    icon={Shield} 
                    color="bg-purple-100 text-purple-600"
                    href="/admin/plans"
                />
                <MetricCard 
                    title="Franchises" 
                    value={data?.metrics?.activeFranchises || 0} 
                    subtitle="Active partners"
                    icon={Building2} 
                    color="bg-indigo-100 text-indigo-600"
                    href="/admin/franchises"
                />
                <MetricCard 
                    title="Service Requests" 
                    value={data?.metrics?.pendingTasks || 0} 
                    subtitle="In progress"
                    icon={Activity} 
                    color="bg-cyan-100 text-cyan-600"
                    href="/admin/service-requests"
                />
            </div>

            {/* DETAILED SECTIONS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Plan Distribution */}
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-slate-800">Plan Distribution</CardTitle>
                            <Link href="/admin/plans" className="text-sm text-teal-600 hover:underline">View All</Link>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {data?.planSales && data.planSales.length > 0 ? (
                            <div className="space-y-3">
                                {data.planSales.slice(0, 5).map((plan, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-sm font-bold">
                                                {plan.value}
                                            </div>
                                            <span className="text-sm font-medium text-slate-700">{plan.name}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">members</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No plan sales yet</p>
                                <Link href="/admin/plans" className="text-xs text-teal-600 hover:underline mt-2 inline-block">
                                    Add Plans →
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-slate-800">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link href="/admin/users/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                <Users className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Add New User</p>
                                <p className="text-xs text-slate-400">Create a new user account</p>
                            </div>
                        </Link>
                        <Link href="/admin/plans/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                                <Shield className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Create Plan</p>
                                <p className="text-xs text-slate-400">Add a new health plan</p>
                            </div>
                        </Link>
                        <Link href="/admin/service-requests" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="p-2 rounded-lg bg-amber-100 text-amber-600">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">View Requests</p>
                                <p className="text-xs text-slate-400">{data?.metrics?.pendingRequests || 0} pending</p>
                            </div>
                        </Link>
                        <Link href="/admin/reimbursements" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="p-2 rounded-lg bg-rose-100 text-rose-600">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700">Process Claims</p>
                                <p className="text-xs text-slate-400">{data?.metrics?.pendingClaims || 0} pending</p>
                            </div>
                        </Link>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-slate-800">Recent Activity</CardTitle>
                            <Link href="/admin/audit" className="text-sm text-teal-600 hover:underline">View All</Link>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {data?.activities && data.activities.length > 0 ? (
                            data.activities.slice(0, 5).map((act, idx) => (
                                <div key={idx} className="flex gap-3 items-start">
                                    <div className="mt-1.5 h-2 w-2 rounded-full bg-teal-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{act.user}</p>
                                        <p className="text-xs text-slate-400">{act.time}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-400">
                                <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No recent activity</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* STATUS CARDS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-emerald-100">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-sm text-emerald-700">Active Members</p>
                            <p className="text-2xl font-bold text-emerald-800">{data?.metrics?.activeMembers || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-amber-100">
                            <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm text-amber-700">Pending Tasks</p>
                            <p className="text-2xl font-bold text-amber-800">{data?.metrics?.pendingTasks || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-100">
                            <TrendingUp className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-blue-700">Total Customers</p>
                            <p className="text-2xl font-bold text-blue-800">{data?.metrics?.newCustomers || 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
