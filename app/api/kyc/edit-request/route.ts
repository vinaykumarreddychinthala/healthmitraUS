import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// POST /api/kyc/edit-request — Customer submits an edit request
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const adminClient = await createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const { memberId, reason } = body;

        if (!memberId || !reason?.trim()) {
            return NextResponse.json({ success: false, error: 'memberId and reason are required' }, { status: 400 });
        }

        // Verify membership ownership
        const { data: member } = await adminClient
            .from('ecard_members')
            .select('id, user_id')
            .eq('id', memberId)
            .eq('user_id', user.id)
            .single();

        if (!member) {
            return NextResponse.json({ success: false, error: 'Member not found or unauthorized' }, { status: 403 });
        }

        // Prevent duplicate pending requests
        const { data: existing } = await adminClient
            .from('kyc_edit_requests')
            .select('id')
            .eq('member_id', memberId)
            .eq('user_id', user.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (existing) {
            return NextResponse.json({
                success: false,
                error: 'You already have a pending edit request for this member.'
            }, { status: 409 });
        }

        const { error } = await adminClient.from('kyc_edit_requests').insert({
            user_id: user.id,
            member_id: memberId,
            reason: reason.trim(),
            status: 'pending',
        });

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true, message: 'Edit request submitted. Admin will review shortly.' });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// GET /api/kyc/edit-request?memberId=xxx — Get request status for a member
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const adminClient = await createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('memberId');

        let query = adminClient
            .from('kyc_edit_requests')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (memberId) query = query.eq('member_id', memberId);

        const { data, error } = await query;
        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

        return NextResponse.json({ success: true, data: data || [] });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
