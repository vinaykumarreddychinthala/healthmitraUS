-- =============================================================================
-- HealthMitra — ID System Migration (Self-Contained, Safe)
-- Card Number (card_unique_id), Member ID (member_id_code), Policy ID (policy_id)
-- Run this in: Supabase Dashboard > SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS guards)
-- =============================================================================

-- Enable UUID extension (safe to run again)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: Create customers table if it doesn't exist yet
-- NOTE: No FK to 'users' or 'plans' tables — only profiles (auth) which always exists
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    users_entry_id  UUID,                          -- plain UUID, no FK dependency
    email           TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    plan_id         UUID,                          -- plain UUID, no FK dependency
    plan_name       TEXT,
    card_unique_id  TEXT,
    member_id_code  TEXT,
    policy_id       TEXT,
    valid_from      DATE,
    valid_till      DATE,
    amount_paid     NUMERIC(12,2) DEFAULT 0,
    currency        TEXT DEFAULT 'USD',
    payment_method  TEXT,
    transaction_id  TEXT,
    status          TEXT DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- STEP 2: Add policy_id column to customers (if table already existed without it)
-- =============================================================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS policy_id TEXT;

-- Add UNIQUE constraint only if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'customers'::regclass
          AND conname = 'customers_policy_id_key'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT customers_policy_id_key UNIQUE (policy_id);
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END;
$$;

-- =============================================================================
-- STEP 3: Ensure member_id_code exists on ecard_members
-- =============================================================================
ALTER TABLE ecard_members ADD COLUMN IF NOT EXISTS member_id_code TEXT;

-- Add UNIQUE constraint only if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'ecard_members'::regclass
          AND conname = 'ecard_members_member_id_code_key'
    ) THEN
        ALTER TABLE ecard_members ADD CONSTRAINT ecard_members_member_id_code_key UNIQUE (member_id_code);
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END;
$$;

-- =============================================================================
-- STEP 4: Indexes for fast lookup
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_policy_id          ON customers(policy_id);
CREATE INDEX IF NOT EXISTS idx_ecard_members_member_id_code ON ecard_members(member_id_code);

-- =============================================================================
-- STEP 5: RLS on customers
-- =============================================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_customers" ON customers;
CREATE POLICY "owner_read_customers" ON customers
    FOR SELECT USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- =============================================================================
-- STEP 6: BACKFILL — MEM-XXXXX (5 digits) for ecard_members with no member_id_code
-- =============================================================================
DO $$
DECLARE
    rec      RECORD;
    new_code TEXT;
    attempts INT;
BEGIN
    FOR rec IN
        SELECT id FROM ecard_members WHERE member_id_code IS NULL
    LOOP
        attempts := 0;
        LOOP
            new_code := 'MEM-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM ecard_members WHERE member_id_code = new_code
            );
            attempts := attempts + 1;
            EXIT WHEN attempts > 100;
        END LOOP;
        UPDATE ecard_members SET member_id_code = new_code WHERE id = rec.id;
    END LOOP;
END;
$$;

-- =============================================================================
-- STEP 7: BACKFILL — POL-XXXXXXX (7 digits) for customers with no policy_id
-- =============================================================================
DO $$
DECLARE
    rec      RECORD;
    new_code TEXT;
    attempts INT;
BEGIN
    FOR rec IN
        SELECT id FROM customers WHERE policy_id IS NULL
    LOOP
        attempts := 0;
        LOOP
            new_code := 'POL-' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM customers WHERE policy_id = new_code
            );
            attempts := attempts + 1;
            EXIT WHEN attempts > 100;
        END LOOP;
        UPDATE customers SET policy_id = new_code WHERE id = rec.id;
    END LOOP;
END;
$$;

-- =============================================================================
-- STEP 8: VERIFY
-- =============================================================================
SELECT
    (SELECT COUNT(*) FROM ecard_members)                                  AS total_members,
    (SELECT COUNT(*) FROM ecard_members WHERE member_id_code IS NOT NULL) AS members_with_id,
    (SELECT COUNT(*) FROM ecard_members WHERE member_id_code IS NULL)     AS members_without_id,
    (SELECT COUNT(*) FROM customers)                                       AS total_customers,
    (SELECT COUNT(*) FROM customers WHERE policy_id IS NOT NULL)           AS customers_with_policy_id,
    (SELECT COUNT(*) FROM customers WHERE policy_id IS NULL)               AS customers_without_policy_id;
