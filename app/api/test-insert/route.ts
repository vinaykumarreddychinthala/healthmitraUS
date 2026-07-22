import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const supabase = await createAdminClient();
    
    // Test if documents column exists and can be inserted to
    const { data, error } = await supabase
        .from('reimbursement_claims')
        .insert({
            user_id: '00000000-0000-0000-0000-000000000000', // Might fail foreign key, but we'll see
            documents: [{ test: 'test' }]
        })
        .select();

    return NextResponse.json({ data, error });
}
