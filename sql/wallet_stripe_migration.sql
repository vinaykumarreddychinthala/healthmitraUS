-- =============================================================================
-- HealthMitra — Wallet & Stripe Migration
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. Fix `wallets` table — add `added_money` column to track Stripe top-ups
--    separately from bill refunds (added_money is NOT withdrawable)
-- =============================================================================
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS added_money NUMERIC(12,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- =============================================================================
-- 2. Fix `wallet_transactions` table — add Stripe reference fields
-- =============================================================================
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE wallet_transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- =============================================================================
-- 3. Fix `withdrawal_requests` table — it's currently only for franchise partners.
--    Add all columns required for customer wallet withdrawals.
-- =============================================================================
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bill_type TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bill_number TEXT;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bill_date DATE;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS bill_document_url TEXT;

-- Ensure status has all needed values
ALTER TABLE withdrawal_requests
    DROP CONSTRAINT IF EXISTS withdrawal_requests_status_check;

ALTER TABLE withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));

-- =============================================================================
-- 4. RLS Policies for wallets
-- =============================================================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow own wallet read" ON wallets;
DROP POLICY IF EXISTS "Allow own wallet insert" ON wallets;
DROP POLICY IF EXISTS "Allow own wallet update" ON wallets;
DROP POLICY IF EXISTS "Allow admin wallet all" ON wallets;

CREATE POLICY "Allow own wallet read" ON wallets
    FOR SELECT USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

CREATE POLICY "Allow own wallet insert" ON wallets
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow own wallet update" ON wallets
    FOR UPDATE USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

CREATE POLICY "Allow admin wallet all" ON wallets
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- =============================================================================
-- 5. RLS Policies for wallet_transactions
-- =============================================================================
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow own wallet_transactions read" ON wallet_transactions;
DROP POLICY IF EXISTS "Allow admin wallet_transactions all" ON wallet_transactions;

CREATE POLICY "Allow own wallet_transactions read" ON wallet_transactions
    FOR SELECT USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

CREATE POLICY "Allow admin wallet_transactions all" ON wallet_transactions
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    );

-- =============================================================================
-- 6. RLS Policies for withdrawal_requests (customer wallet withdrawals)
-- =============================================================================
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow own withdrawal_requests read" ON withdrawal_requests;
DROP POLICY IF EXISTS "Allow own withdrawal_requests insert" ON withdrawal_requests;
DROP POLICY IF EXISTS "Allow admin withdrawal_requests all" ON withdrawal_requests;

-- Users can read their own withdrawal requests
CREATE POLICY "Allow own withdrawal_requests read" ON withdrawal_requests
    FOR SELECT USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- Users can create their own withdrawal requests
CREATE POLICY "Allow own withdrawal_requests insert" ON withdrawal_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Only admins can update (approve/reject/complete) withdrawal requests
CREATE POLICY "Allow admin withdrawal_requests all" ON withdrawal_requests
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- =============================================================================
-- 7. Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_stripe ON wallet_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 
    column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('wallets', 'wallet_transactions', 'withdrawal_requests')
    AND column_name IN ('added_money', 'stripe_payment_intent_id', 'user_id', 'bank_name', 'admin_notes')
ORDER BY table_name, column_name;

SELECT 'Wallet migration applied successfully!' as status;
