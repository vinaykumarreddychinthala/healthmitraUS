-- =============================================================================
-- HealthMitra Database - Missing Tables
-- Run this in: Supabase Dashboard > SQL Editor for your target project
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. FAQS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. TESTIMONIALS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    designation TEXT,
    company TEXT,
    content TEXT NOT NULL,
    rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. PAGES Table (CMS Pages)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    content TEXT,
    template TEXT DEFAULT 'default',
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. HOMEPAGE SECTIONS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS homepage_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_key TEXT UNIQUE NOT NULL,
    title TEXT,
    subtitle TEXT,
    content TEXT,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. MEDIA FOLDERS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS media_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES media_folders(id),
    path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. MEDIA Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folder_id UUID REFERENCES media_folders(id),
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    caption TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. PARTNERS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    company_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    gst_number TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. COMMISSIONS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID,
    user_id UUID,
    plan_id UUID,
    sale_id UUID,
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    commission_type TEXT DEFAULT 'sale',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
    payout_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 9. WITHDRAWALS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    partner_id UUID,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    bank_name TEXT,
    account_number TEXT,
    ifsc_code TEXT,
    upi_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    remarks TEXT,
    processed_by UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 10. SUPPORT TICKETS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number TEXT UNIQUE NOT NULL,
    user_id UUID,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 11. SUPPORT REPLIES Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS support_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID,
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 12. PAYMENT TRANSACTIONS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    plan_id UUID,
    invoice_id UUID,
    transaction_id TEXT,
    gateway TEXT,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    payment_method TEXT,
    gateway_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 13. ACTIVITY LOGS Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    target_resource TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_faqs_active ON faqs(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_homepage_sections_active ON homepage_sections(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_commissions_partner ON commissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_replies_ticket ON support_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- =============================================================================
-- ENABLE RLS (Row Level Security)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    avatar_url TEXT,
    department_id UUID,
    designation TEXT,
    city TEXT,
    state TEXT,
    address TEXT,
    pincode TEXT,
    dob DATE,
    gender TEXT,
    blood_group TEXT,
    aadhaar_number TEXT,
    pan_number TEXT,
    bank_holder_name TEXT,
    bank_account_number TEXT,
    bank_ifsc TEXT,
    bank_name TEXT,
    bank_branch TEXT,
    account_type TEXT,
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    country TEXT DEFAULT 'India',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- FAQS: Public read, admin write
CREATE POLICY "Allow read faqs" ON faqs FOR SELECT USING (true);
CREATE POLICY "Allow admin write faqs" ON faqs FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);

-- TESTIMONIALS: Public read, admin write
CREATE POLICY "Allow read testimonials" ON testimonials FOR SELECT USING (true);
CREATE POLICY "Allow admin write testimonials" ON testimonials FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);

-- PAGES: Public read (published), admin write
CREATE POLICY "Allow read published pages" ON pages FOR SELECT USING (
    is_published = true OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);
CREATE POLICY "Allow admin write pages" ON pages FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);

-- HOMEPAGE SECTIONS: Public read, admin write
CREATE POLICY "Allow read homepage_sections" ON homepage_sections FOR SELECT USING (true);
CREATE POLICY "Allow admin write homepage_sections" ON homepage_sections FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);

-- MEDIA: Public read, auth write
CREATE POLICY "Allow read media" ON media FOR SELECT USING (true);
CREATE POLICY "Allow auth write media" ON media FOR ALL USING (auth.uid() IS NOT NULL);

-- MEDIA FOLDERS: Public read, auth write
CREATE POLICY "Allow read media_folders" ON media_folders FOR SELECT USING (true);
CREATE POLICY "Allow auth write media_folders" ON media_folders FOR ALL USING (auth.uid() IS NOT NULL);

-- PARTNERS: Admin read, admin write
CREATE POLICY "Allow admin read partners" ON partners FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee', 'franchise_owner'))
);
CREATE POLICY "Allow admin write partners" ON partners FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- COMMISSIONS: Owner or admin read, admin write
CREATE POLICY "Allow own commissions read" ON commissions FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);
CREATE POLICY "Allow admin write commissions" ON commissions FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- =============================================================================
-- APPLICATION CORE TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS plan_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    status TEXT DEFAULT 'active',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES plan_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    price NUMERIC(12,2) DEFAULT 0,
    coverage_amount NUMERIC(12,2) DEFAULT 0,
    duration_days INTEGER DEFAULT 365,
    features JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    status TEXT DEFAULT 'draft',
    is_active BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ecard_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    member_id_code TEXT UNIQUE,
    card_unique_id TEXT UNIQUE,
    full_name TEXT NOT NULL,
    relation TEXT DEFAULT 'Self',
    dob DATE,
    gender TEXT,
    blood_group TEXT,
    contact_number TEXT,
    email TEXT,
    aadhaar_last4 TEXT,
    status TEXT DEFAULT 'active',
    valid_from DATE,
    valid_till DATE,
    coverage_amount NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reimbursement_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id_display TEXT UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    title TEXT,
    provider_name TEXT,
    bill_date DATE,
    amount NUMERIC(12,2) DEFAULT 0,
    amount_requested NUMERIC(12,2),
    amount_approved NUMERIC(12,2),
    status TEXT DEFAULT 'pending',
    documents JSONB DEFAULT '[]'::jsonb,
    admin_notes TEXT,
    customer_comments TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'system',
    priority TEXT DEFAULT 'normal',
    action_url TEXT,
    action_label TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    balance NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    minimum_balance NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'success',
    transaction_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id_display TEXT UNIQUE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    details JSONB DEFAULT '{}'::jsonb,
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    region TEXT,
    tier TEXT DEFAULT 'Tier 2',
    pincodes JSONB DEFAULT '[]'::jsonb,
    is_serviceable BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active',
    service_centers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cms_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    is_secure BOOLEAN DEFAULT false,
    updated_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'created',
    payment_method TEXT,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    paypal_order_id TEXT,
    paypal_capture_id TEXT,
    purpose TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
    plan_name TEXT,
    amount NUMERIC(12,2) NOT NULL,
    gst NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    transaction_id TEXT,
    invoice_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phr_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phr_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    member_id UUID REFERENCES ecard_members(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    file_url TEXT,
    doctor_name TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL,
    discount_value NUMERIC(12,2) DEFAULT 0,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_name TEXT NOT NULL,
    code TEXT UNIQUE,
    contact_email TEXT,
    contact_phone TEXT,
    alt_phone TEXT,
    website TEXT,
    gst_number TEXT,
    commission_percentage NUMERIC(5,2) DEFAULT 10,
    commission_percent NUMERIC(5,2) DEFAULT 10,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    bank_details JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    verification_status TEXT DEFAULT 'pending',
    kyc_status TEXT DEFAULT 'pending',
    kyc_history JSONB DEFAULT '[]'::jsonb,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    aadhaar_number TEXT,
    aadhaar_front TEXT,
    aadhaar_back TEXT,
    pan_number TEXT,
    pan_card TEXT,
    photo TEXT,
    mou_signed BOOLEAN DEFAULT false,
    mou_date DATE,
    can_add_sub_partners BOOLEAN DEFAULT false,
    designation_access BOOLEAN DEFAULT false,
    modules JSONB DEFAULT '[]'::jsonb,
    total_members INTEGER DEFAULT 0,
    total_sales NUMERIC(12,2) DEFAULT 0,
    total_commission NUMERIC(12,2) DEFAULT 0,
    last_active TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS franchise_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    code TEXT,
    commission_percent NUMERIC(5,2) DEFAULT 0,
    designation TEXT,
    status TEXT DEFAULT 'active',
    sales_count INTEGER DEFAULT 0,
    total_revenue NUMERIC(12,2) DEFAULT 0,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES franchises(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_resource TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_ecard_members_user_id ON ecard_members(user_id);
CREATE INDEX IF NOT EXISTS idx_ecard_members_plan_id ON ecard_members(plan_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_to ON service_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_request_messages_request_id ON request_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_phr_documents_user_id ON phr_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_user_id ON reimbursement_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_claims_status ON reimbursement_claims(status);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_franchises_status ON franchises(status);
CREATE INDEX IF NOT EXISTS idx_franchise_partners_franchise_id ON franchise_partners(franchise_id);

-- WITHDRAWALS: Owner or admin
CREATE POLICY "Allow own withdrawals read" ON withdrawals FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);
CREATE POLICY "Allow auth create withdrawals" ON withdrawals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow admin write withdrawals" ON withdrawals FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- SUPPORT TICKETS: Owner or agent/admin
CREATE POLICY "Allow own tickets read" ON support_tickets FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee', 'call_center_agent'))
);
CREATE POLICY "Allow auth create tickets" ON support_tickets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow admin write tickets" ON support_tickets FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);

-- SUPPORT REPLIES: Owner or agent/admin
CREATE POLICY "Allow own replies read" ON support_replies FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee', 'call_center_agent'))
);
CREATE POLICY "Allow auth create replies" ON support_replies FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Allow admin write replies" ON support_replies FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);

-- PAYMENT TRANSACTIONS: Owner or admin
CREATE POLICY "Allow own transactions read" ON payment_transactions FOR SELECT USING (
    user_id = auth.uid() OR 
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'employee'))
);
CREATE POLICY "Allow admin write transactions" ON payment_transactions FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- ACTIVITY LOGS: Admin only
CREATE POLICY "Allow admin read activity_logs" ON activity_logs FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);
CREATE POLICY "Allow admin write activity_logs" ON activity_logs FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
);

-- =============================================================================
-- SEED DATA (Optional homepage sections)
-- =============================================================================
INSERT INTO homepage_sections (section_key, title, is_active, sort_order) VALUES
    ('hero', 'Hero Section', true, 1),
    ('features', 'Features Section', true, 2),
    ('plans', 'Plans Section', true, 3),
    ('testimonials', 'Testimonials Section', true, 4),
    ('faq', 'FAQ Section', true, 5),
    ('cta', 'Call to Action', true, 6),
    ('footer', 'Footer', true, 7)
ON CONFLICT (section_key) DO NOTHING;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'Tables created successfully!' as status;


-- ===== SUBSCRIPTION ACCESS CONTROL & PLAN CATEGORIES =====

-- 1. Create plan_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS plan_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    status TEXT DEFAULT 'active',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed basic categories
INSERT INTO plan_categories (name, status) 
VALUES 
    ('Consultation', 'active'),
    ('Diagnostics', 'active'),
    ('Mental Health', 'active'),
    ('Wellness', 'active')
ON CONFLICT DO NOTHING;

-- 2. Update plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS allowed_services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS category_ids JSONB DEFAULT '[]'::jsonb;

-- 3. Remove unique constraint on user_id in ecard_members (if it exists accidentally)
-- Note: ecard_members should allow multiple plans per user.
-- By default, member_id_code and card_unique_id are UNIQUE, which is fine as they are generated per membership.


