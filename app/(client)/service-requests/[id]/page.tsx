import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RequestTimeline } from "@/components/client/requests/RequestTimeline";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: request } = await supabase.from('service_requests')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

    if (!request) notFound();

    // Transform details from jsonb
    const details = request.details || {};

    return (
        <div className="container mx-auto max-w-5xl py-6 animate-in fade-in-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <Link href="/service-requests">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Request Details</h1>
                        <p className="text-slate-500">Track and manage your service request</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT COLUMN: Details */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <Badge className="mb-2 bg-blue-100 text-blue-700 hover:bg-blue-100 uppercase">{request.type?.replace('_', ' ')}</Badge>
                                <h2 className="text-xl font-bold text-slate-900">{id.slice(0, 8).toUpperCase()}</h2>
                            </div>
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 uppercase">
                                {request.status}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h3 className="font-semibold text-slate-700 mb-2">Service Details</h3>
                                <div className="space-y-2 text-slate-600">
                                    <p><span className="text-slate-400">Request Date:</span> <br />{new Date(request.created_at).toLocaleString()}</p>
                                    <p><span className="text-slate-400">Doctor/Provider/Hospital:</span> <br />{details.doctorName || details.hospitalName || 'N/A'}</p>
                                    <p><span className="text-slate-400">Specialization/Type:</span> <br />{details.specialization || details.department || details.voucherType || 'N/A'}</p>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-700 mb-2">Scheduling</h3>
                                <div className="space-y-2 text-slate-600">
                                    <p><span className="text-slate-400">Date & Time:</span> <br />
                                        <span className="font-medium text-teal-700 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> {details.preferredDate || details.visitDate || 'N/A'} {details.preferredTime || details.appointmentTime || ''}
                                        </span>
                                    </p>
                                    <p><span className="text-slate-400">Member:</span> <br />{details.patientName || details.voucherMember || details.policy_holder_name || 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <h3 className="font-semibold text-slate-700 mb-2">Description / Details</h3>
                            <p className="text-slate-600 bg-slate-50 p-3 rounded-lg text-sm">
                                {details.symptoms || details.medicalIssue || details.description || details.subject || details.voucherDetails || 'No additional details provided.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Status */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="font-semibold text-slate-900 mb-6">Status Timeline</h3>
                        <RequestTimeline
                            steps={[
                                { id: 'submitted', label: 'Request Submitted', status: 'completed', date: new Date(request.created_at).toLocaleDateString() },
                                { id: 'processing', label: 'Processing', status: request.status === 'in_progress' ? 'current' : (['completed', 'approved', 'rejected'].includes(request.status) ? 'completed' : 'pending') },
                                { id: 'completed', label: 'Completed', status: request.status === 'completed' ? 'completed' : 'pending' }
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
