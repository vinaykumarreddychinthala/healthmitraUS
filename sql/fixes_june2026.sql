-- =============================================================================
-- HealthMitra — Bug Fixes (June 2026)
-- Run this in: Supabase Dashboard > SQL Editor
-- =============================================================================

-- =============================================================================
-- FIX 1: Add missing 'country' column to profiles (and other address fields)
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;

-- =============================================================================
-- FIX 1.5: Add missing columns to phr_documents
-- =============================================================================
ALTER TABLE phr_documents ADD COLUMN IF NOT EXISTS file_size TEXT;
ALTER TABLE phr_documents ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- =============================================================================
-- FIX 2: phr_documents RLS — Allow authenticated users to insert their own records
-- =============================================================================
ALTER TABLE phr_documents ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies if they exist
DROP POLICY IF EXISTS "Allow own phr_documents read" ON phr_documents;
DROP POLICY IF EXISTS "Allow own phr_documents insert" ON phr_documents;
DROP POLICY IF EXISTS "Allow own phr_documents update" ON phr_documents;
DROP POLICY IF EXISTS "Allow own phr_documents delete" ON phr_documents;
DROP POLICY IF EXISTS "Allow admin phr_documents" ON phr_documents;

-- Users can read their own PHR documents
CREATE POLICY "Allow own phr_documents read" ON phr_documents
    FOR SELECT USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee', 'call_center_agent'))
    );

-- Users can insert their own PHR documents (authenticated)
CREATE POLICY "Allow own phr_documents insert" ON phr_documents
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- Users can update their own PHR documents
CREATE POLICY "Allow own phr_documents update" ON phr_documents
    FOR UPDATE USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- Users can delete their own PHR documents
CREATE POLICY "Allow own phr_documents delete" ON phr_documents
    FOR DELETE USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- =============================================================================
-- FIX 3: Storage bucket policies for 'documents' bucket
-- Allow authenticated users to upload to their own folder
-- Run these in Supabase Dashboard > Storage > Policies (or SQL Editor)
-- =============================================================================

-- Storage: Allow authenticated users to upload files
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop old storage policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner update documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner delete documents" ON storage.objects;

-- Allow any authenticated user to upload to their own user folder
CREATE POLICY "Allow authenticated uploads documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'documents');

-- Allow public read access to documents
CREATE POLICY "Allow public read documents"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'documents');

-- Allow users to update their own objects
CREATE POLICY "Allow owner update documents"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Allow users to delete their own objects
CREATE POLICY "Allow owner delete documents"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[2]);

-- =============================================================================
-- FIX 4: profiles RLS — Ensure users can update their own profile
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow own profile read" ON profiles;
DROP POLICY IF EXISTS "Allow own profile update" ON profiles;
DROP POLICY IF EXISTS "Allow own profile insert" ON profiles;
DROP POLICY IF EXISTS "Allow admin profile read" ON profiles;
DROP POLICY IF EXISTS "Allow admin profile all" ON profiles;

-- Users can read their own profile
CREATE POLICY "Allow own profile read" ON profiles
    FOR SELECT USING (
        id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- Users can insert their own profile (for new users)
CREATE POLICY "Allow own profile insert" ON profiles
    FOR INSERT WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Allow own profile update" ON profiles
    FOR UPDATE USING (
        id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
    );

-- Admin full access
CREATE POLICY "Allow admin profile all" ON profiles
    FOR ALL USING (
        auth.uid() IN (SELECT id FROM profiles p2 WHERE p2.role = 'admin')
    );

-- =============================================================================
-- FIX 5: service_requests RLS — Allow authenticated users to create requests
-- =============================================================================
DROP POLICY IF EXISTS "Allow own service_requests read" ON service_requests;
DROP POLICY IF EXISTS "Allow own service_requests insert" ON service_requests;

CREATE POLICY "Allow own service_requests read" ON service_requests
    FOR SELECT USING (
        user_id = auth.uid()
        OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee', 'call_center_agent'))
    );

CREATE POLICY "Allow own service_requests insert" ON service_requests
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow admin service_requests update" ON service_requests
    FOR UPDATE USING (
        auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee', 'call_center_agent'))
    );

-- =============================================================================
-- VERIFICATION & CACHE REFRESH
-- =============================================================================
-- Force PostgREST to reload its schema cache so the API immediately recognizes new columns
-- (Supabase usually handles this automatically after DDL changes)

SELECT 
    column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND column_name IN ('country', 'address_line1', 'address_line2', 'height_cm', 'weight_kg')
ORDER BY column_name;

SELECT 'Fixes applied successfully! Schema cache reloaded.' as status;
