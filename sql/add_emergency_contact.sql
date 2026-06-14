-- Add emergency_contact JSONB column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}'::jsonb;

-- Add country column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';

-- Comment on column
COMMENT ON COLUMN profiles.emergency_contact IS 'Stores emergency contact information: {name, relation, phone}';
