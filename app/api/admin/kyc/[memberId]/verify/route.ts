import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request, context: { params: Promise<{ memberId: string }> }) {
    try {
        const { memberId } = await context.params;
        const supabase = await createClient();
        const adminClient = createAdminClient();

        // 1. Authenticate user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Check Admin Role
        const { data: profile } = await adminClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // 3. Update KYC Record
        const now = new Date().toISOString();
        const { error: updateError } = await adminClient
            .from('policy_holder_kyc')
            .update({ 
                admin_verified: true,
                admin_verified_at: now
            })
            .eq('member_id', memberId);

        if (updateError) {
            console.error('Failed to verify KYC:', updateError);
            return NextResponse.json({ success: false, error: 'Database error while verifying KYC' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'KYC verified successfully' });
    } catch (error: any) {
        console.error('Verify KYC error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
