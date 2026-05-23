-- =============================================================================
-- OTP Verifications Tracking Table
-- Track users who verified OTPs but haven't purchased a plan yet
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================================

CREATE TABLE IF NOT EXISTS otp_verifications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT NOT NULL,
    name          TEXT,
    phone         TEXT,
    plan_id       UUID REFERENCES plans(id) ON DELETE SET NULL,
    plan_name     TEXT,                          -- denormalized for fast access
    verify_count  INTEGER DEFAULT 1,             -- how many times they've verified
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),     -- first OTP verify time
    last_seen_at  TIMESTAMPTZ DEFAULT NOW(),     -- most recent OTP verify time
    verify_log    JSONB DEFAULT '[]'::jsonb,     -- array of { verified_at, plan_id, plan_name }
    converted     BOOLEAN DEFAULT false,         -- true = bought a plan, stop tracking
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT otp_verifications_email_plan_unique UNIQUE (email, plan_id)
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_otp_verif_email       ON otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_verif_converted   ON otp_verifications(converted);
CREATE INDEX IF NOT EXISTS idx_otp_verif_last_seen   ON otp_verifications(last_seen_at DESC);

-- Enable RLS — only service role (admin client) can write; admin users can read
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Admin read policy
CREATE POLICY "Allow admin read otp_verifications" ON otp_verifications
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- Service-role insert/update (our API uses admin client which bypasses RLS)
-- No additional policy needed for service role writes
