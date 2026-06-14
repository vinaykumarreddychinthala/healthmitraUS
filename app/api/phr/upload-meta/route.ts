import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// POST /api/phr/upload-meta — Save PHR document metadata after file is uploaded to storage
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const adminClient = await createAdminClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { name, category, file_url, file_size, member_id, doctor_name, tags } = body;

        if (!name || !category || !file_url) {
            return NextResponse.json(
                { success: false, error: 'name, category, and file_url are required' },
                { status: 400 }
            );
        }

        const { data, error } = await adminClient.from('phr_documents').insert({
            user_id: user.id,
            name,
            category,
            file_url,
            file_size: file_size || null,
            member_id: member_id || null,
            doctor_name: doctor_name || null,
            tags: tags || [],
        }).select().single();

        if (error) {
            console.error('PHR metadata insert error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (err: any) {
        console.error('PHR upload-meta error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
