import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET: Fetch KYC details for a member (admin only)
export async function GET(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
    const { memberId } = await params;
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const { data: kyc } = await adminClient
            .from('policy_holder_kyc').select('*').eq('member_id', memberId).maybeSingle();

        return NextResponse.json({ success: true, data: kyc || null });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH: Admin update or reset KYC
export async function PATCH(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
    const { memberId } = await params;
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const body = await request.json();
        const { action, notes, updates } = body;

        if (action === 'reset') {
            // Reset KYC — forces customer to re-submit
            await adminClient.from('policy_holder_kyc').update({
                admin_reset: true,
                kyc_submitted: false,
                admin_reset_by: user.id,
                admin_reset_at: new Date().toISOString(),
                admin_notes: notes || null,
                updated_at: new Date().toISOString(),
            }).eq('member_id', memberId);
            return NextResponse.json({ success: true, message: 'KYC reset. Customer must re-submit.' });
        }

        if (action === 'update' && updates) {
            // Admin edits specific fields
            const allowed = ['holder_full_name', 'relation', 'aadhaar_number', 'aadhaar_declaration', 'pan_number', 'pan_declaration', 'admin_notes'];
            const safeUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
            for (const key of allowed) {
                if (key in updates) safeUpdates[key] = updates[key];
            }
            await adminClient.from('policy_holder_kyc').update(safeUpdates).eq('member_id', memberId);
            return NextResponse.json({ success: true, message: 'KYC updated successfully.' });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
