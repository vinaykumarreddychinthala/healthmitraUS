import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// Returns the primary (Self) ecard_member for the logged-in user
// Used by useKYCStatus hook to determine which member's KYC to check
export async function GET() {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ memberId: null });

        // Get the primary (Self relation) active member
        const { data: member } = await adminClient
            .from('ecard_members')
            .select('id')
            .eq('user_id', user.id)
            .eq('relation', 'Self')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return NextResponse.json({ memberId: member?.id || null });
    } catch (error: any) {
        return NextResponse.json({ memberId: null });
    }
}
