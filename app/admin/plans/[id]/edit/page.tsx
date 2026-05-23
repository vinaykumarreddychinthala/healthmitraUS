'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    ArrowLeft, ArrowRight, Save, CheckCircle, Plus, Trash2,
    ChevronUp, ChevronDown, Upload, FileText, ImageIcon, HelpCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Plan, PlanService, PlanDetail, PlanCategory } from '@/types/plans';
import { getCategories, getPlan, updatePlan as savePlan } from '@/app/actions/plans';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import { use } from 'react';

const TOTAL_STEPS = 5;

const SYSTEM_SERVICES = [
    { id: 'ambulance', label: 'Ambulance' },
    { id: 'medical_consultation', label: 'Doctor Consultation' },
    { id: 'diagnostic', label: 'Lab Tests / Diagnostic' },
    { id: 'caretaker', label: 'Caretaker' },
    { id: 'nursing', label: 'Nursing' },
];

function ImageDropzone({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const url = URL.createObjectURL(file);
            onChange(url);
            toast.success(`Image selected: ${file.name}`);
        }
    }, [onChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        maxFiles: 1,
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${isDragActive ? 'border-teal-500 bg-teal-50' : 'border-slate-300 hover:border-teal-400 hover:bg-slate-50'}
                ${value ? 'bg-teal-50/50 border-teal-200' : ''}`}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-full ${value ? 'bg-teal-100' : 'bg-slate-100'}`}>
                    <ImageIcon className={`h-6 w-6 ${value ? 'text-teal-600' : 'text-slate-400'}`} />
                </div>
                {value ? (
                    <p className="text-sm text-teal-600 font-medium">Image selected — Click to change</p>
                ) : (
                    <>
                        <p className="text-sm text-slate-600 font-medium">
                            {isDragActive ? 'Drop image here...' : 'Drag & drop plan image'}
                        </p>
                        <p className="text-xs text-slate-400">PNG, JPG, WEBP — max 5MB</p>
                    </>
                )}
            </div>
        </div>
    );
}

function PdfDropzone({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const url = URL.createObjectURL(file);
            onChange(url);
            toast.success(`Brochure selected: ${file.name}`);
        }
    }, [onChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
                ${value ? 'bg-blue-50/50 border-blue-200' : ''}`}
        >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
                <div className={`p-3 rounded-full ${value ? 'bg-blue-100' : 'bg-slate-100'}`}>
                    <FileText className={`h-6 w-6 ${value ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                {value ? (
                    <p className="text-sm text-blue-600 font-medium">Brochure selected — Click to change</p>
                ) : (
                    <>
                        <p className="text-sm text-slate-600 font-medium">
                            {isDragActive ? 'Drop PDF here...' : 'Drag & drop brochure PDF'}
                        </p>
                        <p className="text-xs text-slate-400">PDF format only — max 10MB</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [plan, setPlan] = useState<Partial<Plan>>({});
    const [categories, setCategories] = useState<PlanCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [catRes, planRes] = await Promise.all([
                    getCategories(),
                    getPlan(resolvedParams.id)
                ]);
                
                if (catRes.success && catRes.data) {
                    setCategories(catRes.data);
                }
                
                if (planRes.success && planRes.data) {
                    setPlan(planRes.data);
                } else {
                    toast.error('Plan not found');
                    router.push('/admin/plans');
                }
            } catch (err) {
                toast.error('Failed to load plan');
                router.push('/admin/plans');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [resolvedParams.id, router]);

    const updatePlanData = (updates: Partial<Plan>) => {
        setPlan(prev => {
            const updated = { ...prev, ...updates };
            if (updates.basePrice !== undefined || updates.gstPercent !== undefined) {
                const base = updates.basePrice ?? prev.basePrice ?? 0;
                const gst = 0;
                updated.totalPrice = base;
            }
            return updated;
        });
    };

    const handleServiceAdd = () => {
        const newService: PlanService = {
            id: `srv_${Date.now()}`,
            name: '',
            categoryId: categories[0]?.id || '',
            description: '',
            status: 'enabled',
            displayOrder: (plan.services?.length || 0) + 1
        };
        updatePlanData({ services: [...(plan.services || []), newService] });
    };

    const updateService = (id: string, updates: Partial<PlanService>) => {
        updatePlanData({
            services: plan.services?.map(s => s.id === id ? { ...s, ...updates } : s)
        });
    };

    const removeService = (id: string) => {
        updatePlanData({ services: plan.services?.filter(s => s.id !== id) });
    };

    const handleDetailAdd = () => {
        const newDetail: PlanDetail = {
            id: `pd_${Date.now()}`,
            question: '',
            answer: '',
        };
        updatePlanData({ planDetails: [...(plan.planDetails || []), newDetail] });
    };

    const updateDetail = (id: string, updates: Partial<PlanDetail>) => {
        updatePlanData({
            planDetails: plan.planDetails?.map(d => d.id === id ? { ...d, ...updates } : d)
        });
    };

    const removeDetail = (id: string) => {
        updatePlanData({ planDetails: plan.planDetails?.filter(d => d.id !== id) });
    };

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS) setCurrentStep(c => c + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
    };

    const handleSave = async () => {
        setSaving(true);
        toast.loading("Saving plan...");
        const res = await savePlan(resolvedParams.id, plan);
        toast.dismiss();

        if (res && res.success) {
            toast.success("Plan Saved Successfully", {
                description: "Your changes have been saved."
            });
            router.push('/admin/plans');
        } else {
            toast.error("Failed to save plan", { description: res?.error });
        }
        setSaving(false);
    };

    const stepLabels = [
        '1. Basic Details',
        '2. Media',
        '3. Validity & Members',
        '4. Plan Details (Q&A)',
        '5. Review & Publish',
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-8 animate-in fade-in space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Edit Plan</h1>
                    <p className="text-slate-500">{plan.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap mt-2">
                        {stepLabels.map((label, i) => (
                            <span key={i} className="flex items-center gap-2">
                                {i > 0 && <span className="text-slate-300">/</span>}
                                <span
                                    className={`cursor-pointer transition-colors ${currentStep >= i + 1 ? "text-teal-600 font-medium" : "hover:text-slate-700"}`}
                                    onClick={() => setCurrentStep(i + 1)}
                                >
                                    {label}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/plans">
                        <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100">Cancel</Button>
                    </Link>
                    <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Step Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
                />
            </div>

            <Card className="bg-white border-slate-200 shadow-sm min-h-[500px]">
                <CardContent className="p-8">

                    {/* STEP 1: BASIC DETAILS */}
                    {currentStep === 1 && (
                        <div className="space-y-6 slide-in-from-right-4 duration-500 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Plan Name *</Label>
                                    <Input value={plan.name || ''} onChange={e => updatePlanData({ name: e.target.value })} placeholder="e.g. Gold Health Plan" className="bg-white border-slate-200 text-slate-900" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Plan Type *</Label>
                                    <RadioGroup
                                        value={plan.type || 'B2C'}
                                        onValueChange={(v) => updatePlanData({ type: v as 'B2C' | 'B2B' })}
                                        className="flex gap-4 p-2 bg-slate-50 border border-slate-200 rounded-md"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="B2C" id="b2c" />
                                            <Label htmlFor="b2c">B2C (Public)</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="B2B" id="b2b" />
                                            <Label htmlFor="b2b">B2B (Private)</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>

                            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                <div>
                                    <Label className="text-base text-slate-800">Plan Categories</Label>
                                    <p className="text-sm text-slate-500 mb-3">Select the categories this plan belongs to.</p>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {categories.map(c => (
                                        <div key={c.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`cat_${c.id}`}
                                                checked={(plan.categoryIds || []).includes(c.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        updatePlanData({ categoryIds: [...(plan.categoryIds || []), c.id] });
                                                    } else {
                                                        updatePlanData({ categoryIds: (plan.categoryIds || []).filter(id => id !== c.id) });
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`cat_${c.id}`} className="cursor-pointer">{c.name}</Label>
                                        </div>
                                    ))}
                                    {categories.length === 0 && <span className="text-sm text-slate-500">No categories found. Create them in Categories.</span>}
                                </div>
                            </div>

                            <div className="space-y-3 p-4 bg-teal-50 border border-teal-200 rounded-xl">
                                <div>
                                    <Label className="text-base text-teal-800 font-bold">System Access Controls (Allowed Services)</Label>
                                    <p className="text-sm text-teal-600 mb-3">Which backend services does this plan grant access to?</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {SYSTEM_SERVICES.map(s => (
                                        <div key={s.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`svc_${s.id}`}
                                                checked={(plan.allowed_services || []).includes(s.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        updatePlanData({ allowed_services: [...(plan.allowed_services || []), s.id] });
                                                    } else {
                                                        updatePlanData({ allowed_services: (plan.allowed_services || []).filter(id => id !== s.id) });
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`svc_${s.id}`} className="cursor-pointer font-medium">{s.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={plan.description || ''} onChange={e => updatePlanData({ description: e.target.value })} placeholder="Detailed plan description..." className="bg-white border-slate-200 text-slate-900 h-32" />
                            </div>

                            <div className="grid grid-cols-3 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="space-y-2">
                                    <Label>Base Price ($) *</Label>
                                    <Input type="number" value={plan.basePrice || 0} onChange={e => updatePlanData({ basePrice: parseFloat(e.target.value) })} className="bg-white border-slate-200 text-slate-900" />
                                </div>
                                {/* <div className="space-y-2">
                                    <Label>GST (%)</Label>
                                    <Input type="number" value={plan.gstPercent || 0} onChange={e => updatePlanData({ gstPercent: parseFloat(e.target.value) })} className="bg-white border-slate-200 text-slate-900" />
                                </div> */}
                                <div className="space-y-2">
                                    <Label className="text-teal-600">Total Price (Auto)</Label>
                                    <div className="h-10 px-3 py-2 bg-teal-50 border border-teal-200 rounded-md text-teal-600 font-bold">
                                        $ {plan.totalPrice?.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: MEDIA */}
                    {currentStep === 2 && (
                        <div className="space-y-6 slide-in-from-right-4 duration-500 animate-in fade-in max-w-2xl mx-auto">
                            <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                                <Upload className="h-5 w-5 text-teal-500" />
                                Plan Media & Documents
                            </h3>

                            <div className="space-y-2">
                                <Label>Plan Image</Label>
                                <p className="text-xs text-slate-400 mb-2">Thumbnail image displayed on the plan card and website</p>
                                <ImageDropzone
                                    value={plan.planImage}
                                    onChange={(v) => updatePlanData({ planImage: v })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Brochure (Plan PDF)</Label>
                                <p className="text-xs text-slate-400 mb-2">Downloadable brochure PDF for the plan</p>
                                <PdfDropzone
                                    value={plan.brochurePdf}
                                    onChange={(v) => updatePlanData({ brochurePdf: v })}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: VALIDITY & MEMBERS */}
                    {currentStep === 3 && (
                        <div className="space-y-6 slide-in-from-right-4 duration-500 animate-in fade-in max-w-2xl mx-auto">
                            <div className="space-y-4 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                                <h3 className="text-lg font-medium text-slate-800">Plan Duration</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Validity Type</Label>
                                        <Select value={plan.validityType || 'year'} onValueChange={v => updatePlanData({ validityType: v as 'year' | 'month' })}>
                                            <SelectTrigger className="bg-white border-slate-200 text-slate-900">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white text-slate-900 border-slate-200">
                                                <SelectItem value="year">Year(s)</SelectItem>
                                                <SelectItem value="month">Month(s)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Value</Label>
                                        <Input type="number" value={plan.validityValue || 1} onChange={e => updatePlanData({ validityValue: parseInt(e.target.value) })} className="bg-white border-slate-200 text-slate-900" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                                <h3 className="text-lg font-medium text-slate-800">Member Type</h3>
                                <p className="text-sm text-slate-500 -mt-2">Choose how many people this plan covers. Each member gets their own E-Card.</p>

                                <div className="grid grid-cols-2 gap-4 mt-3">
                                    {/* Single Member */}
                                    <button
                                        type="button"
                                        onClick={() => updatePlanData({ memberCountMin: 1, memberCountMax: 1 })}
                                        className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-left
                                            ${(plan.memberCountMax ?? 1) === 1
                                                ? 'border-teal-500 bg-teal-50 shadow-md shadow-teal-100'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                                            ${(plan.memberCountMax ?? 1) === 1 ? 'bg-teal-100' : 'bg-slate-100'}`}>
                                            👤
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${(plan.memberCountMax ?? 1) === 1 ? 'text-teal-800' : 'text-slate-700'}`}>
                                                Single Member
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">1 E-Card · 1 Policy Holder</p>
                                        </div>
                                        {(plan.memberCountMax ?? 1) === 1 && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>

                                    {/* Multi Member */}
                                    <button
                                        type="button"
                                        onClick={() => updatePlanData({ memberCountMin: 1, memberCountMax: plan.memberCountMax && plan.memberCountMax > 1 ? plan.memberCountMax : 4 })}
                                        className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-left
                                            ${(plan.memberCountMax ?? 1) > 1
                                                ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                                            ${(plan.memberCountMax ?? 1) > 1 ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                            👨‍👩‍👧‍👦
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm ${(plan.memberCountMax ?? 1) > 1 ? 'text-blue-800' : 'text-slate-700'}`}>
                                                Multi Member
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">Multiple E-Cards · Family Plan</p>
                                        </div>
                                        {(plan.memberCountMax ?? 1) > 1 && (
                                            <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                </div>

                                {(plan.memberCountMax ?? 1) > 1 && (
                                    <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in-50">
                                        <Label className="text-blue-800 font-semibold">Maximum Members Allowed</Label>
                                        <p className="text-xs text-blue-600">How many E-Cards can be issued under this plan? (Min: 2, Max: 20)</p>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min={2} max={20}
                                                value={plan.memberCountMax ?? 4}
                                                onChange={e => updatePlanData({ memberCountMax: parseInt(e.target.value) })}
                                                className="flex-1 accent-blue-500"
                                            />
                                            <div className="w-16 h-10 flex items-center justify-center bg-white border-2 border-blue-300 rounded-xl font-bold text-blue-700 text-lg">
                                                {plan.memberCountMax ?? 4}
                                            </div>
                                        </div>
                                        <p className="text-xs text-blue-500">
                                            Up to <strong>{plan.memberCountMax}</strong> members — each gets their own E-Card after KYC.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <div>
                                    <Label className="text-base text-slate-800">Show on Website</Label>
                                    <p className="text-sm text-slate-500">Make this plan visible to public users.</p>
                                </div>
                                <Switch checked={plan.showOnWebsite || false} onCheckedChange={c => updatePlanData({ showOnWebsite: c })} />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <div>
                                    <Label className="text-base text-slate-800">Featured Plan</Label>
                                    <p className="text-sm text-slate-500">Display this plan on the homepage hero section.</p>
                                </div>
                                <Switch checked={plan.isFeatured || false} onCheckedChange={c => updatePlanData({ isFeatured: c })} />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: PLAN DETAILS (Q&A) */}
                    {currentStep === 4 && (
                        <div className="space-y-6 slide-in-from-right-4 duration-500 animate-in fade-in">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                                        <HelpCircle className="h-5 w-5 text-teal-500" />
                                        Plan Details — Q&A
                                    </h3>
                                </div>
                                <Button onClick={handleDetailAdd} variant="outline" size="sm" className="border-teal-600 text-teal-600 hover:bg-teal-50">
                                    <Plus className="mr-2 h-4 w-4" /> Add Q&A
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {plan.planDetails?.length === 0 && (
                                    <div className="text-center p-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">
                                        <HelpCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                        <p className="font-medium">No Q&A items yet</p>
                                    </div>
                                )}
                                {plan.planDetails?.map((detail, index) => (
                                    <div key={detail.id} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 relative group hover:bg-white hover:shadow-sm transition-all">
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeDetail(detail.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="h-7 w-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-600 text-xs font-bold shrink-0 mt-1">
                                                Q{index + 1}
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500">Question</Label>
                                                    <Input value={detail.question} onChange={e => updateDetail(detail.id, { question: e.target.value })} placeholder="e.g. What does this plan cover?" className="bg-white border-slate-200 text-slate-900" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-slate-500">Answer</Label>
                                                    <Textarea value={detail.answer} onChange={e => updateDetail(detail.id, { answer: e.target.value })} placeholder="Provide a detailed answer..." className="bg-white border-slate-200 text-slate-900 min-h-[80px]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: REVIEW */}
                    {currentStep === 5 && (
                        <div className="space-y-8 slide-in-from-right-4 duration-500 animate-in fade-in">
                            <div className="bg-gradient-to-br from-white to-slate-50 border border-teal-100 rounded-2xl p-8 text-center space-y-4 shadow-sm">
                                <div className="mx-auto h-16 w-16 bg-teal-50 rounded-full flex items-center justify-center mb-4 border border-teal-100">
                                    <CheckCircle className="h-8 w-8 text-teal-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">{plan.name || 'Untitled Plan'}</h2>
                                <p className="text-slate-500 max-w-md mx-auto">{plan.description || 'No description provided.'}</p>

                                <div className="flex justify-center gap-8 py-6 border-t border-b border-slate-200">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-teal-600">${plan.totalPrice?.toFixed(0)}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider">Total Price</div>
                                    </div>
                                    <div className="w-px bg-slate-200 h-12"></div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-slate-800">{plan.allowed_services?.length || 0}</div>
                                        <div className="text-xs text-slate-500 uppercase tracking-wider">Access Controls</div>
                                    </div>
                                    <div className="w-px bg-slate-200 h-12"></div>
                                    <div className="text-center">
                                        {(plan.memberCountMax ?? 1) === 1 ? (
                                            <>
                                                <div className="text-2xl font-bold text-teal-600">👤 Single</div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">1 E-Card</div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="text-2xl font-bold text-blue-600">👨‍👩‍👧‍👦 ×{plan.memberCountMax}</div>
                                                <div className="text-xs text-slate-500 uppercase tracking-wider">Multi Member</div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Footer Navigation */}
            <div className="flex justify-between mt-8">
                <Button onClick={handleBack} disabled={currentStep === 1} variant="outline" className="border-slate-200 text-slate-600 hover:bg-slate-50">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
            </div>
        </div>
    );
}
