import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const memberId          = formData.get('memberId') as string;
        const holderFullName    = formData.get('holderFullName') as string;
        const relation          = formData.get('relation') as string;
        const aadhaarNumber     = formData.get('aadhaarNumber') as string | null;
        const aadhaarDeclaration = formData.get('aadhaarDeclaration') === 'true';
        const panNumber         = formData.get('panNumber') as string | null;
        const panDeclaration    = formData.get('panDeclaration') === 'true';
        const photoFile         = formData.get('photo') as File | null;

        // --- Validations ---
        if (!memberId || !holderFullName || !relation) {
            return NextResponse.json({ success: false, error: 'Full name, relation, and member ID are required' }, { status: 400 });
        }
        if (!aadhaarDeclaration && (!aadhaarNumber || aadhaarNumber.replace(/\D/g, '').length !== 12)) {
            return NextResponse.json({ success: false, error: 'Valid 12-digit Aadhaar number is required, or check the declaration box' }, { status: 400 });
        }
        if (!panDeclaration && (!panNumber || panNumber.length !== 10)) {
            return NextResponse.json({ success: false, error: 'Valid 10-character PAN number is required, or check the declaration box' }, { status: 400 });
        }
        if (!photoFile || photoFile.size === 0) {
            return NextResponse.json({ success: false, error: 'Photo is required' }, { status: 400 });
        }
        if (photoFile.size > 2 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'Photo must be less than 2MB' }, { status: 400 });
        }
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(photoFile.type)) {
            return NextResponse.json({ success: false, error: 'Photo must be JPEG, PNG, or PDF' }, { status: 400 });
        }

        // Verify member belongs to this user
        const { data: member } = await adminClient
            .from('ecard_members').select('id, user_id').eq('id', memberId).single();
        if (!member || member.user_id !== user.id) {
            return NextResponse.json({ success: false, error: 'Member not found or unauthorized' }, { status: 403 });
        }

        // Check if KYC already submitted (and not reset by admin)
        const { data: existingKyc, error: kycTableError } = await adminClient
            .from('policy_holder_kyc').select('id, kyc_submitted, admin_reset').eq('member_id', memberId).maybeSingle();

        // If table doesn't exist, the error will mention "relation does not exist"
        if (kycTableError && kycTableError.message?.includes('relation') && kycTableError.message?.includes('does not exist')) {
            return NextResponse.json({
                success: false,
                error: 'Database not set up: please run sql/policy_holder_kyc.sql in Supabase SQL Editor first.'
            }, { status: 500 });
        }

        if (existingKyc?.kyc_submitted && !existingKyc?.admin_reset) {
            return NextResponse.json({ success: false, error: 'KYC already submitted. Contact admin to make changes.' }, { status: 409 });
        }

        // Auto-create the bucket if it doesn't exist yet
        const { data: buckets } = await adminClient.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'member-photos');
        if (!bucketExists) {
            await adminClient.storage.createBucket('member-photos', { public: true });
        }

        // Upload photo to Supabase Storage
        const ext = photoFile.type === 'application/pdf' ? 'pdf'
            : photoFile.type === 'image/png' ? 'png' : 'jpg';
        const photoPath = `${user.id}/${memberId}/photo_${Date.now()}.${ext}`;

        // Convert ArrayBuffer → Buffer (required for Node.js Supabase SDK)
        const photoArrayBuffer = await photoFile.arrayBuffer();
        const photoBuffer = Buffer.from(photoArrayBuffer);

        const { error: uploadError } = await adminClient.storage
            .from('member-photos')
            .upload(photoPath, photoBuffer, {
                contentType: photoFile.type,
                upsert: true,
            });

        if (uploadError) {
            console.error('Photo upload error:', JSON.stringify(uploadError));
            return NextResponse.json({
                success: false,
                error: `Failed to upload photo: ${uploadError.message || 'Storage error. Please try again.'}`
            }, { status: 500 });
        }

        const { data: { publicUrl } } = adminClient.storage.from('member-photos').getPublicUrl(photoPath);
        const now = new Date().toISOString();

        // Upsert KYC record
        const kycPayload = {
            member_id: memberId,
            user_id: user.id,
            holder_full_name: holderFullName.trim(),
            relation,
            aadhaar_number: aadhaarDeclaration ? null : aadhaarNumber?.replace(/\s/g, '') || null,
            aadhaar_declaration: aadhaarDeclaration,
            pan_number: panDeclaration ? null : panNumber?.toUpperCase() || null,
            pan_declaration: panDeclaration,
            photo_url: publicUrl,
            photo_path: photoPath,
            kyc_submitted: true,
            kyc_submitted_at: now,
            admin_reset: false,
            updated_at: now,
        };

        if (existingKyc) {
            await adminClient.from('policy_holder_kyc').update(kycPayload).eq('id', existingKyc.id);
        } else {
            await adminClient.from('policy_holder_kyc').insert({ ...kycPayload, created_at: now });
        }

        return NextResponse.json({ success: true, message: 'KYC submitted successfully. You can now download your E-Card.' });
    } catch (error: any) {
        const detail = error?.message || JSON.stringify(error) || 'Unknown error';
        console.error('KYC submit error full:', detail);
        return NextResponse.json({ success: false, error: detail }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const adminClient = createAdminClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('memberId');
        if (!memberId) return NextResponse.json({ success: false, error: 'memberId required' }, { status: 400 });

        const { data: kyc } = await adminClient
            .from('policy_holder_kyc')
            .select('*')
            .eq('member_id', memberId)
            .eq('user_id', user.id)
            .maybeSingle();

        return NextResponse.json({
            success: true,
            kycSubmitted: !!(kyc?.kyc_submitted && !kyc?.admin_reset),
            data: kyc || null,
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
