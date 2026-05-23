import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const adminClient = createAdminClient();
        const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single();
        if (profile?.role !== 'admin') return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = (page - 1) * limit;

        let dbQuery = adminClient
            .from('otp_verifications')
            .select('*', { count: 'exact' })
            .eq('converted', false)
            .order('last_seen_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (query) {
            dbQuery = dbQuery.or(`email.ilike.%${query}%,name.ilike.%${query}%,phone.ilike.%${query}%`);
        }

        const { data, error, count } = await dbQuery;

        if (error) throw error;

        return NextResponse.json({ success: true, data: data || [], total: count || 0 });
    } catch (error: any) {
        console.error('Potential customers fetch error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
