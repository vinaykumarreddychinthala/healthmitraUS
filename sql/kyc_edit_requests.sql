-- =============================================================================
-- KYC Edit Requests Table
-- Customers raise requests to edit their locked KYC details.
-- Admins review and either approve (then edit) or reject with a note.
-- Run in: Supabase Dashboard > SQL Editor
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS kyc_edit_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    member_id       UUID NOT NULL REFERENCES ecard_members(id) ON DELETE CASCADE,

    -- Customer-submitted reason
    reason          TEXT NOT NULL,

    -- Workflow status
    status          TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected

    -- Admin response
    admin_note      TEXT,
    resolved_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kyc_edit_requests_user_id   ON kyc_edit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_edit_requests_member_id ON kyc_edit_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_kyc_edit_requests_status    ON kyc_edit_requests(status);

-- RLS
ALTER TABLE kyc_edit_requests ENABLE ROW LEVEL SECURITY;

-- Customer can read their own requests
CREATE POLICY "Customer read own edit requests" ON kyc_edit_requests
    FOR SELECT USING (user_id = auth.uid());

-- Customer can insert (raise a request) for their own members only
CREATE POLICY "Customer insert own edit requests" ON kyc_edit_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin can read all requests
CREATE POLICY "Admin read all edit requests" ON kyc_edit_requests
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Admin can update (approve/reject) any request
CREATE POLICY "Admin update edit requests" ON kyc_edit_requests
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Also add admin_verified column to policy_holder_kyc if not exists
ALTER TABLE policy_holder_kyc
    ADD COLUMN IF NOT EXISTS admin_verified      BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS admin_verified_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS admin_verified_by   UUID REFERENCES profiles(id) ON DELETE SET NULL;
