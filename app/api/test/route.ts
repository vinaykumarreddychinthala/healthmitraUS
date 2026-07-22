import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
        .from('reimbursement_claims')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    return NextResponse.json({ data, error });
}
