-- =============================================================================
-- HealthMitra — Users & Customers Separation
-- 
-- FLOW:
--   1. User verifies OTP  → row inserted into `users` table
--   2. User buys a plan   → row inserted into `customers` table
--                           AND users.user_id gets linked to their auth UUID
--
-- Run this in: Supabase Dashboard › SQL Editor
-- =============================================================================

-- Enable UUID extension (safe to run again if already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE 1: users
-- Tracks every person who has verified their email via OTP.
-- They may or may not have bought a plan.
-- user_id is NULL until they purchase (that's when the auth account is created).
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT UNIQUE NOT NULL,
    name          TEXT,
    phone         TEXT,
    -- The plan they were interested in at OTP-verify time (may differ from purchased plan)
    interested_plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    -- Linked to auth.users → profiles after they create an account (at purchase)
    user_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
    -- How did they enter the system?
    source        TEXT DEFAULT 'otp_verify'
                      CHECK (source IN ('otp_verify', 'admin_created', 'checkout')),
    status        TEXT DEFAULT 'active'
                      CHECK (status IN ('active', 'inactive')),
    -- When they first verified their OTP
    verified_at   TIMESTAMPTZ DEFAULT NOW(),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS
    'Every person who verified their email via OTP. Superset of customers.';
COMMENT ON COLUMN users.user_id IS
    'Populated once the person buys a plan and a Supabase auth account is created.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_id    ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_status     ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- =============================================================================
-- TABLE 2: customers
-- Tracks every person who has purchased a plan.
-- Always a subset of `users`.
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Link back to auth account (profiles)
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Link back to the users table
    users_entry_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Personal info (copied from the purchase form)
    email           TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    -- Plan details (denormalised for quick access)
    plan_id         UUID REFERENCES plans(id) ON DELETE SET NULL,
    plan_name       TEXT,
    -- Membership details
    card_unique_id  TEXT,
    member_id_code  TEXT,
    valid_from      DATE,
    valid_till      DATE,
    -- Payment details
    amount_paid     NUMERIC(12,2) DEFAULT 0,
    currency        TEXT DEFAULT 'USD',
    payment_method  TEXT,
    transaction_id  TEXT,
    -- Status
    status          TEXT DEFAULT 'active'
                        CHECK (status IN ('active', 'expired', 'cancelled', 'suspended')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE customers IS
    'Everyone who has purchased a plan. Always a subset of the users table.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id    ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_email      ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_plan_id    ON customers(plan_id);
CREATE INDEX IF NOT EXISTS idx_customers_status     ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_valid_till ON customers(valid_till);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- users: only admins can read; service role (admin client) writes via API
CREATE POLICY "admin_read_users" ON users
    FOR SELECT USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- customers: owner can read their own row; admin can read all
CREATE POLICY "owner_read_customers" ON customers
    FOR SELECT USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users')    AS users_table_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'customers') AS customers_table_exists;
