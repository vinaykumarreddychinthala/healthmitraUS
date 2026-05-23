-- =============================================================================
-- Plan Member Type Migration
-- Add member_count_min / member_count_max to plans table
-- Run this in Supabase Dashboard > SQL Editor
-- =============================================================================

ALTER TABLE plans ADD COLUMN IF NOT EXISTS member_count_min INTEGER DEFAULT 1;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS member_count_max INTEGER DEFAULT 1;

-- Back-fill existing plans: set max=1 (single member) unless you know otherwise
-- If you want to default existing plans to multi (4 members), change 1 to 4
UPDATE plans SET member_count_min = 1, member_count_max = 1 WHERE member_count_max IS NULL;

-- Add a comment for clarity
COMMENT ON COLUMN plans.member_count_min IS 'Minimum members required for this plan (usually 1)';
COMMENT ON COLUMN plans.member_count_max IS 'Maximum members allowed. 1 = Single Member plan. >1 = Multi Member plan.';
