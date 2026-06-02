import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const ALLOWED_BUCKETS = ['documents', 'images', 'avatars'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'heic', 'heif', 'webp', 'tiff', 'tif', 'bmp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function sanitizePath(path: string): string {
    // Remove any path traversal attempts
    return path.replace(/\.\./g, '').replace(/^\//, '').trim();
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        let bucket = formData.get('bucket') as string || 'documents';
        let folder = formData.get('folder') as string || 'general';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Sanitize bucket - only allow whitelisted buckets
        bucket = sanitizePath(bucket);
        if (!ALLOWED_BUCKETS.includes(bucket)) {
            bucket = 'documents'; // Default to documents if invalid
        }

        // Sanitize folder to prevent path traversal
        folder = sanitizePath(folder);
        if (!folder) {
            folder = 'general';
        }

        // Validate file extension
        const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
            return NextResponse.json({ 
                success: false, 
                error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
                }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ 
                success: false, 
                error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
            }, { status: 400 });
        }

        const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${folder}/${user.id}/${safeFileName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Use admin client to bypass storage RLS
        const adminClient = await createAdminClient();
        const { error: uploadError } = await adminClient.storage
            .from(bucket)
            .upload(filePath, buffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
        }

        const { data: { publicUrl } } = adminClient.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            data: {
                path: filePath,
                url: publicUrl,
                name: file.name,
                size: file.size,
                type: file.type,
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
    }
}
