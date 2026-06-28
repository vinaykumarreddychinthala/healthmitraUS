'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Mail, MessageCircle, HelpCircle, Plus, X, Search, ChevronDown, ChevronUp, Send, Upload, Clock, CheckCircle, AlertCircle, Ticket, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { createSupportTicket } from '@/app/actions/support';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SupportTicket } from '@/types/support';

// Default FAQ categories (fallback if DB is empty)
const DEFAULT_FAQ_CATEGORIES = [
    { name: 'Plans & Coverage', count: 0 },
    { name: 'E-Cards', count: 0 },
    { name: 'Reimbursements', count: 0 },
    { name: 'Wallet & Payments', count: 0 },
    { name: 'Service Requests', count: 0 },
    { name: 'Account & Profile', count: 0 },
];

// Default FAQs (fallback)
const DEFAULT_FAQS = [
    { q: 'How do I download my E-Card?', a: 'To download your E-Card, go to E-Cards section, click on the member\'s card, and use the "Download" or "Share" button.', popular: true },
    { q: 'How long does reimbursement approval take?', a: 'Reimbursement claims are typically reviewed within 3-5 business days.', popular: true },
    { q: 'Can I withdraw money from my wallet?', a: 'Yes, you can withdraw money from approved reimbursements (Bill Refunds).', popular: true },
    { q: 'How do I add family members to my plan?', a: 'Go to My Purchases, select your plan, and click "Manage Members".', popular: true },
];

const TICKET_CATEGORIES = [
    'Service Request Issue',
    'Reimbursement Query',
    'E-Card Problem',
    'Wallet/Payment Issue',
    'Plan/Coverage Question',
    'Technical Problem',
    'Other'
];

type TabType = 'tickets' | 'faq' | 'contact';

interface SupportClientProps {
    initialTickets: SupportTicket[];
}

export default function SupportClient({ initialTickets }: SupportClientProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('tickets');
    const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [faqSearch, setFaqSearch] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    // Real data from DB
    const [faqCategories, setFaqCategories] = useState(DEFAULT_FAQ_CATEGORIES);
    const [faqs, setFaqs] = useState(DEFAULT_FAQS);

    // Fetch FAQs from Supabase
    useEffect(() => {
        const fetchFAQs = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from('cms_content')
                .select('key, value')
                .like('key', 'faq_%')
                .eq('status', 'active')
                .limit(20);

            if (data && data.length > 0) {
                const parsedFaqs = data.map((item: any) => {
                    try {
                        return JSON.parse(item.value);
                    } catch {
                        return null;
                    }
                }).filter(Boolean);

                if (parsedFaqs.length > 0) {
                    setFaqs(parsedFaqs);
                    
                    // Group by category
                    const categoryCounts: Record<string, number> = {};
                    parsedFaqs.forEach((f: any) => {
                        const cat = f.category || 'General';
                        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                    });
                    
                    const categories = Object.entries(categoryCounts).map(([name, count]) => ({
                        name,
                        count
                    }));
                    
                    if (categories.length > 0) {
                        setFaqCategories(categories);
                    }
                }
            }
        };
        
        fetchFAQs();
    }, []);

    // New ticket form
    const [ticketForm, setTicketForm] = useState({
        category: '',
        subject: '',
        description: '',
        priority: 'medium',
        attachment: null as File | null
    });

    const handleSubmitTicket = async () => {
        if (!ticketForm.category || !ticketForm.subject || !ticketForm.description) {
            toast.error('Please fill all required fields');
            return;
        }

        setSubmitting(true);
        const res = await createSupportTicket({
            category: ticketForm.category,
            subject: ticketForm.subject,
            description: ticketForm.description,
            priority: ticketForm.priority
        });
        setSubmitting(false);

        if (res.success) {
            toast.success('Ticket Submitted Successfully!', {
                description: `Ticket ID: ${res.data.request_id_display}. We'll respond within 24 hours.`
            });
            setIsNewTicketOpen(false);
            setTicketForm({ category: '', subject: '', description: '', priority: 'medium', attachment: null });
            router.refresh();
        } else {
            toast.error('Failed to submit ticket', { description: res.error });
        }
    };

    const filteredFaqs = faqs.filter((faq: any) =>
        faq.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
        faq.a.toLowerCase().includes(faqSearch.toLowerCase())
    );

    const openTickets = initialTickets.filter(t => t.status === 'open' || t.status === 'pending');
    const resolvedTickets = initialTickets.filter(t => t.status === 'resolved' || t.status === 'closed');

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Support & Help</h1>
                    <p className="text-slate-500">We&apos;re here to help you 24/7</p>
                </div>
                <button
                    onClick={() => setIsNewTicketOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-medium hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200"
                >
                    <Plus size={16} /> Raise Ticket
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Phone size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1">Call Us</h3>
                    <p className="text-slate-500 text-xs mb-2">Available 24/7</p>
                    <a href="tel:+919818823106" className="text-teal-600 font-bold hover:underline">+91 9818823106</a>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Mail size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1">Email Us</h3>
                    <p className="text-slate-500 text-xs mb-2">Reply within 24hrs</p>
                    <a href="mailto:service@healthmitraus.com" className="text-blue-600 font-bold hover:underline text-sm">service@healthmitraus.com</a>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageCircle size={24} />
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1">Live Chat</h3>
                    <p className="text-slate-500 text-xs mb-2">
                        <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full mr-1"></span>WhatsApp
                    </p>
                    <a
                        href="https://wa.me/919818823106"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 font-bold hover:underline"
                    >
                        Chat on WhatsApp →
                    </a>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200">
                    {[
                        { id: 'tickets', label: 'My Tickets', icon: Ticket },
                        { id: 'faq', label: 'FAQ', icon: HelpCircle },
                        { id: 'contact', label: 'Contact Info', icon: Phone },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
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
                    {/* MY TICKETS TAB */}
                    {activeTab === 'tickets' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-slate-800">My Support Tickets ({initialTickets.length})</h3>
                                <button
                                    onClick={() => setIsNewTicketOpen(true)}
                                    className="text-sm text-teal-600 font-medium hover:underline"
                                >
                                    + Raise New Ticket
                                </button>
                            </div>

                            {/* Open Tickets */}
                            {openTickets.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-slate-500">Open Tickets ({openTickets.length})</h4>
                                    {openTickets.map(ticket => (
                                        <div key={ticket.id} className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                        <span className="text-lg">🎫</span>
                                                        <h4 className="font-semibold text-slate-800">{ticket.subject}</h4>
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Open</span>
                                                        {ticket.priority === 'high' && (
                                                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">High Priority</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-3">
                                                        Ticket ID: {ticket.id} • Created: {ticket.createdAt} • Last Reply: {ticket.lastReply}
                                                    </p>
                                                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                                                        <p className="text-xs text-slate-400 mb-1">Last Update from Support:</p>
                                                        <p className="text-sm text-slate-700">&quot;{ticket.lastMessage}&quot;</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-3">
                                                <button onClick={() => toast.info(`Viewing ticket ${ticket.id}`, { description: 'Full conversation thread loaded.' })} className="px-4 py-2 text-sm font-medium text-teal-600 bg-white border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors">
                                                    View Full Thread
                                                </button>
                                                <button onClick={() => toast.success('Reply sent!', { description: 'Your response has been added to the ticket.' })} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1">
                                                    <Send size={14} /> Reply
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Resolved Tickets */}
                            {resolvedTickets.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-slate-500">Resolved Tickets ({resolvedTickets.length})</h4>
                                    {resolvedTickets.map(ticket => (
                                        <div key={ticket.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                                        <span className="text-lg">🎫</span>
                                                        <h4 className="font-medium text-slate-700">{ticket.subject}</h4>
                                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                            <CheckCircle size={10} /> Resolved
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mb-2">
                                                        Ticket ID: {ticket.id} • Created: {ticket.createdAt} • Resolved: {ticket.resolvedAt}
                                                    </p>
                                                        <p className="text-sm text-slate-600">
                                                        <strong>Resolution:</strong> &quot;{ticket.resolution}&quot;
                                                    </p>
                                                </div>
                                                <button onClick={() => toast.info(`Ticket ${ticket.id}`, { description: `Resolution: ${ticket.resolution}` })} className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {initialTickets.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="text-5xl mb-4">🎫</div>
                                    <p className="text-slate-600 font-medium">No tickets yet</p>
                                    <p className="text-slate-400 text-sm mt-1">Raise a ticket if you need help</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* FAQ TAB */}
                    {activeTab === 'faq' && (
                        <div className="space-y-6">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search FAQs..."
                                    value={faqSearch}
                                    onChange={(e) => setFaqSearch(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Popular Questions */}
                            <div>
                                <h4 className="font-semibold text-slate-800 mb-4">Popular Questions</h4>
                                <div className="space-y-2">
                                    {filteredFaqs.map((faq, idx) => (
                                        <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                            >
                                                <span className="font-medium text-slate-800">{faq.q}</span>
                                                {expandedFaq === idx ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                                            </button>
                                            {expandedFaq === idx && (
                                                <div className="px-4 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
                                                    {faq.a}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* FAQ Categories */}
                            <div>
                                <h4 className="font-semibold text-slate-800 mb-4">Browse by Category</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {faqCategories.map(cat => (
                                        <button key={cat.name} onClick={() => toast.info(`${cat.name}`, { description: `${cat.count} FAQs in this category.` })} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-left hover:border-teal-300 hover:bg-teal-50 transition-all">
                                            <p className="font-medium text-slate-700 text-sm">{cat.name}</p>
                                            <p className="text-xs text-slate-500">{cat.count} FAQs</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CONTACT INFO TAB */}
                    {activeTab === 'contact' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Digital Contact Methods */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Direct Contact</h3>
                                    
                                    <div className="group flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all">
                                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                            <Phone size={24} />
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <h4 className="font-semibold text-slate-800 text-base">Phone Support</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <p className="text-xs font-medium text-slate-500 mb-1">USA Helpline</p>
                                                    <a href="tel:+17165790346" className="font-bold text-slate-700 hover:text-teal-600">+1 716-579-0346</a>
                                                </div>
                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <p className="text-xs font-medium text-slate-500 mb-1">India Helpline</p>
                                                    <a href="tel:+919818823106" className="font-bold text-slate-700 hover:text-teal-600">+91 9818823106</a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="group flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Mail size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 text-base mb-2">Email Support</h4>
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <p className="text-xs font-medium text-slate-500 mb-1">General & Support Queries</p>
                                                <a href="mailto:service@healthmitraus.com" className="font-bold text-slate-700 hover:text-blue-600 text-sm md:text-base">service@healthmitraus.com</a>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="group flex items-start gap-4 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all">
                                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                            <Clock size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800 text-base mb-2">Business Hours</h4>
                                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-slate-600">Monday – Saturday</span>
                                                    <span className="font-bold text-slate-800">9:00 AM – 8:00 PM</span>
                                                </div>
                                                <div className="h-px bg-slate-200"></div>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-medium text-slate-600">Sunday</span>
                                                    <span className="font-bold text-slate-800">10:00 AM – 6:00 PM</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Office Locations */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Our Offices</h3>
                                    
                                    <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
                                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-teal-100 rounded-full opacity-50 blur-2xl"></div>
                                        <div className="flex items-start gap-4 relative z-10">
                                            <div className="w-10 h-10 bg-white shadow-sm text-2xl rounded-full flex items-center justify-center shrink-0">🇺🇸</div>
                                            <div>
                                                <h4 className="font-bold text-teal-900 text-lg mb-2">USA Office</h4>
                                                <p className="text-sm text-teal-800/80 leading-relaxed font-medium">
                                                    1550 Sheridan Drive,<br />
                                                    Buffalo, NY 14217,<br />
                                                    United States
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
                                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-100 rounded-full opacity-50 blur-2xl"></div>
                                        <div className="flex items-start gap-4 relative z-10">
                                            <div className="w-10 h-10 bg-white shadow-sm text-2xl rounded-full flex items-center justify-center shrink-0">🇮🇳</div>
                                            <div>
                                                <h4 className="font-bold text-indigo-900 text-lg mb-2">India Office</h4>
                                                <p className="text-sm text-indigo-800/80 leading-relaxed font-medium">
                                                    HealthMitra Systems Pvt Ltd.<br />
                                                    C/O JSS Academy of Technical Education,<br />
                                                    C-20/1, Sector 62, Noida,<br />
                                                    Uttar Pradesh 201309
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-6 p-4 bg-slate-800 rounded-2xl text-center text-white">
                                        <p className="text-sm font-medium mb-1">Need immediate assistance?</p>
                                        <p className="text-xs text-slate-300 mb-3">Our support team usually replies within 5 minutes</p>
                                        <button onClick={() => setIsNewTicketOpen(true)} className="w-full py-2.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors">
                                            Raise a Support Ticket
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* New Ticket Modal */}
            {isNewTicketOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-4">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Raise Support Ticket</h3>
                            <button onClick={() => setIsNewTicketOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                            {/* Category */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Issue Category <span className="text-red-500">*</span></label>
                                <select
                                    value={ticketForm.category}
                                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                    <option value="">Select category</option>
                                    {TICKET_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Subject <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={ticketForm.subject}
                                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                                    placeholder="Brief description of issue"
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Detailed Description <span className="text-red-500">*</span></label>
                                <textarea
                                    value={ticketForm.description}
                                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                                    placeholder="Explain your issue in detail..."
                                    rows={4}
                                    maxLength={1000}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                                <p className="text-xs text-slate-400 text-right">{ticketForm.description.length}/1000 characters</p>
                            </div>

                            {/* Attachment */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Attach Files (Optional)</label>
                                <div
                                    className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-teal-300 transition-colors"
                                    onClick={() => document.getElementById('ticketAttachment')?.click()}
                                >
                                    <input
                                        type="file"
                                        id="ticketAttachment"
                                        className="hidden"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => setTicketForm({ ...ticketForm, attachment: e.target.files?.[0] || null })}
                                    />
                                    {ticketForm.attachment ? (
                                        <div className="flex items-center justify-center gap-2 text-teal-600">
                                            <FileText size={18} />
                                            <span className="text-sm font-medium">{ticketForm.attachment.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                                            <p className="text-sm text-slate-500">Drag & drop screenshots or documents here</p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Priority</label>
                                <div className="flex gap-3">
                                    {[
                                        { value: 'low', label: 'Low' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'high', label: 'High' },
                                        { value: 'urgent', label: 'Urgent' },
                                    ].map(priority => (
                                        <label key={priority.value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="priority"
                                                value={priority.value}
                                                checked={ticketForm.priority === priority.value}
                                                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                                                className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                                            />
                                            <span className="text-sm text-slate-700">{priority.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setIsNewTicketOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitTicket}
                                disabled={submitting}
                                className="px-6 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors shadow-lg shadow-teal-200 disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : 'Submit Ticket'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
