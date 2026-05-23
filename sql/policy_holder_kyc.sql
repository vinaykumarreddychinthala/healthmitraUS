-- =============================================================================
-- Policy Holder KYC Details Table
-- Stores KYC/identity details for each ecard_member before download is allowed
-- Run in: Supabase Dashboard > SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS policy_holder_kyc (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id            UUID NOT NULL REFERENCES ecard_members(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Identity Fields
    holder_full_name     TEXT NOT NULL,
    relation             TEXT NOT NULL,             -- Self, Spouse, Father, Mother, Son, Daughter, Other

    -- Aadhaar (either number OR declaration)
    aadhaar_number       TEXT,                      -- 12-digit, NULL if declaration used
    aadhaar_declaration  BOOLEAN NOT NULL DEFAULT false,  -- true = no aadhaar, self-declared

    -- PAN (either number OR declaration)
    pan_number           TEXT,                      -- 10-char, NULL if declaration used
    pan_declaration      BOOLEAN NOT NULL DEFAULT false,  -- true = no pan, self-declared

    -- Photo
    photo_url            TEXT NOT NULL,             -- Supabase Storage public URL
    photo_path           TEXT,                      -- Storage path for deletion

    -- Status
    kyc_submitted        BOOLEAN NOT NULL DEFAULT false,
    kyc_submitted_at     TIMESTAMPTZ,

    -- Admin override
    admin_reset          BOOLEAN DEFAULT false,     -- if true, admin forced re-submission
    admin_reset_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
    admin_reset_at       TIMESTAMPTZ,
    admin_notes          TEXT,

    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT policy_holder_kyc_member_unique UNIQUE (member_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_policy_kyc_member_id ON policy_holder_kyc(member_id);
CREATE INDEX IF NOT EXISTS idx_policy_kyc_user_id   ON policy_holder_kyc(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_kyc_submitted ON policy_holder_kyc(kyc_submitted);

-- RLS
ALTER TABLE policy_holder_kyc ENABLE ROW LEVEL SECURITY;

-- Customer can only read their OWN kyc records
CREATE POLICY "Customer read own kyc" ON policy_holder_kyc
    FOR SELECT USING (user_id = auth.uid());

-- Customer cannot insert/update directly — must go through API (service role)
-- Service role bypasses RLS automatically

-- Admin read policy
CREATE POLICY "Admin read all kyc" ON policy_holder_kyc
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- =============================================================================
-- Supabase Storage bucket for member photos
-- Run this separately OR create via Supabase Dashboard > Storage
-- =============================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('member-photos', 'member-photos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy: any authenticated user can upload to their own folder
-- CREATE POLICY "Auth users upload photos" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'member-photos' AND auth.uid() IS NOT NULL);

-- Storage policy: public read
-- CREATE POLICY "Public read member photos" ON storage.objects
--     FOR SELECT USING (bucket_id = 'member-photos');
