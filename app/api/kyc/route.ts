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
        const dob               = formData.get('dob') as string;
        const gender            = formData.get('gender') as string;
        const bloodGroup        = formData.get('bloodGroup') as string;
        const aadhaarNumber     = formData.get('aadhaarNumber') as string | null;
        const aadhaarDeclaration = formData.get('aadhaarDeclaration') === 'true';
        const panNumber         = formData.get('panNumber') as string | null;
        const panDeclaration    = formData.get('panDeclaration') === 'true';
        const photoFile         = formData.get('photo') as File | null;
        const aadhaarFile       = formData.get('aadhaarFile') as File | null;
        const panFile           = formData.get('panFile') as File | null;

        // --- Validations ---
        // bloodGroup is optional; all other personal fields are required
        if (!memberId || !holderFullName || !relation || !dob || !gender) {
            return NextResponse.json({ success: false, error: 'Full name, relation, date of birth, and gender are required' }, { status: 400 });
        }
        if (!aadhaarDeclaration) {
            if (!aadhaarNumber || aadhaarNumber.replace(/\D/g, '').length !== 12) {
                return NextResponse.json({ success: false, error: 'Valid 12-digit Aadhaar number is required, or check the declaration box' }, { status: 400 });
            }
            if (!aadhaarFile || aadhaarFile.size === 0) {
                return NextResponse.json({ success: false, error: 'Aadhaar document file is required, or check the declaration box' }, { status: 400 });
            }
        }
        if (!panDeclaration) {
            if (!panNumber || panNumber.length !== 10) {
                return NextResponse.json({ success: false, error: 'Valid 10-character PAN number is required, or check the declaration box' }, { status: 400 });
            }
            if (!panFile || panFile.size === 0) {
                return NextResponse.json({ success: false, error: 'PAN document file is required, or check the declaration box' }, { status: 400 });
            }
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

        const { error: uploadError } = await adminClient.storage
            .from('member-photos')
            .upload(photoPath, photoFile, {
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
        // Helper function for uploading files
        const uploadDoc = async (file: File | null, prefix: string) => {
            if (!file) return { url: null, path: null };
            const ext = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
            const path = `${user.id}/${memberId}/${prefix}_${Date.now()}.${ext}`;
            
            const { error } = await adminClient.storage.from('member-photos').upload(path, file, { contentType: file.type, upsert: true });
            if (error) throw new Error(`Failed to upload ${prefix}`);
            
            const { data: { publicUrl } } = adminClient.storage.from('member-photos').getPublicUrl(path);
            return { url: publicUrl, path };
        };

        let aadhaarUpload = { url: null as string | null, path: null as string | null };
        let panUpload = { url: null as string | null, path: null as string | null };

        try {
            if (aadhaarFile && !aadhaarDeclaration) aadhaarUpload = await uploadDoc(aadhaarFile, 'aadhaar');
            if (panFile && !panDeclaration) panUpload = await uploadDoc(panFile, 'pan');
        } catch (uploadErr: any) {
            return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 });
        }

        const now = new Date().toISOString();

        // Upsert KYC record
        const kycPayload = {
            member_id: memberId,
            user_id: user.id,
            holder_full_name: holderFullName.trim(),
            relation,
            aadhaar_number: aadhaarDeclaration ? null : aadhaarNumber?.replace(/\s/g, '') || null,
            aadhaar_declaration: aadhaarDeclaration,
            aadhaar_file_url: aadhaarUpload.url,
            aadhaar_file_path: aadhaarUpload.path,
            pan_number: panDeclaration ? null : panNumber?.toUpperCase() || null,
            pan_declaration: panDeclaration,
            pan_file_url: panUpload.url,
            pan_file_path: panUpload.path,
            photo_url: publicUrl,
            photo_path: photoPath,
            kyc_submitted: true,
            kyc_submitted_at: now,
            admin_reset: false,
            updated_at: now,
        };

        if (existingKyc) {
            const { error: updateError } = await adminClient.from('policy_holder_kyc').update(kycPayload).eq('id', existingKyc.id);
            if (updateError) throw updateError;
        } else {
            const { error: insertError } = await adminClient.from('policy_holder_kyc').insert({ ...kycPayload, created_at: now });
            if (insertError) throw insertError;
        }

        // Update the corresponding ecard_members record
        const { error: memberUpdateError } = await adminClient
            .from('ecard_members')
            .update({
                full_name: holderFullName.trim(),
                relation: relation,
                dob: dob,
                gender: gender,
                blood_group: bloodGroup,
                status: 'active'
            })
            .eq('id', memberId);

        if (memberUpdateError) {
            console.error('Failed to update ecard_members on KYC submit:', memberUpdateError);
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
