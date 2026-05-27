-- =============================================================================
-- HealthMitra — Production Ready Database Reset Script
-- 
-- PURPOSE:
--   Wipes all transactional, testing, and customer data, while keeping
--   only the admin credentials/profiles and re-seeding default settings/categories.
--
-- HOW TO RUN:
--   1. Go to your Supabase Dashboard (https://supabase.com).
--   2. Navigate to SQL Editor -> New Query.
--   3. Paste this script and click "Run".
-- =============================================================================

BEGIN;

-- 1. DELETE ALL NON-ADMIN USERS (This cascades to their public.profiles rows)
DELETE FROM auth.users 
WHERE id NOT IN (
    SELECT id 
    FROM public.profiles 
    WHERE role = 'admin'
);

-- 2. DELETE ANY ORPHANED NON-ADMIN PROFILES
DELETE FROM public.profiles 
WHERE role IS DISTINCT FROM 'admin';

-- 3. DYNAMICALLY TRUNCATE ALL OTHER PUBLIC SCHEMA TABLES
-- This clears all test data across all tables except the 'profiles' table itself,
-- resetting identity counters and resolving foreign key cascades.
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT IN ('profiles')
    ) LOOP
        EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE;';
    END LOOP;
END $$;

-- 4. RE-SEED DEFAULT DEPARTMENTS
INSERT INTO public.departments (id, name, description, is_active) 
VALUES 
    (uuid_generate_v4(), 'Customer Support', 'Handle customer queries and issues', true),
    (uuid_generate_v4(), 'Sales', 'Handle sales and inquiries', true),
    (uuid_generate_v4(), 'Claims', 'Handle reimbursement claims', true)
ON CONFLICT DO NOTHING;

-- 5. RE-SEED DEFAULT PHR CATEGORIES
INSERT INTO public.phr_categories (id, name, description, is_active)
VALUES
    (uuid_generate_v4(), 'Prescriptions', 'Doctor prescriptions and medicines', true),
    (uuid_generate_v4(), 'Test Reports', 'Lab reports and diagnostic results', true),
    (uuid_generate_v4(), 'Bills', 'Medical bills and invoices', true)
ON CONFLICT DO NOTHING;

-- 6. RE-SEED DEFAULT HOMEPAGE SECTIONS
INSERT INTO public.homepage_sections (section_key, title, is_active, sort_order) 
VALUES
    ('hero', 'Hero Section', true, 1),
    ('features', 'Features Section', true, 2),
    ('plans', 'Plans Section', true, 3),
    ('testimonials', 'Testimonials Section', true, 4),
    ('faq', 'FAQ Section', true, 5),
    ('cta', 'Call to Action', true, 6),
    ('footer', 'Footer', true, 7)
ON CONFLICT (section_key) DO NOTHING;

-- 7. RE-SEED DEFAULT PLAN CATEGORIES
INSERT INTO public.plan_categories (name, status) 
VALUES 
    ('Consultation', 'active'),
    ('Diagnostics', 'active'),
    ('Mental Health', 'active'),
    ('Wellness', 'active')
ON CONFLICT DO NOTHING;

COMMIT;

-- VERIFICATION
SELECT 'Database successfully cleared! Admin credentials and default seeds preserved.' AS status;
