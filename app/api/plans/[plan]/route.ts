import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ plan: string }> }
) {
    try {
        const resolvedParams = await params;
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .eq('id', resolvedParams.plan)
            .eq('status', 'active')
            .single();

        if (error || !data) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch plan' }, { status: 500 });
    }
}
