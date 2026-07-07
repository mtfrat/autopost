-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. tenant_companies table
CREATE TABLE IF NOT EXISTS tenant_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    industry_vertical TEXT,
    brand_voice_guidelines TEXT,
    brand_colors TEXT,
    visual_style_guidelines TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. platform_configurations table
CREATE TABLE IF NOT EXISTS platform_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL CHECK (platform_name IN ('linkedin', 'x', 'instagram')),
    is_active BOOLEAN DEFAULT TRUE,
    cron_schedule_expr TEXT,
    tone_modifier TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, platform_name)
);

-- 3. content_backlog table
CREATE TABLE IF NOT EXISTS content_backlog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    source_topic TEXT NOT NULL,
    context_data TEXT,
    is_consumed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. generated_assets table
CREATE TABLE IF NOT EXISTS generated_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    platform_name TEXT NOT NULL CHECK (platform_name IN ('linkedin', 'x', 'instagram')),
    generated_text TEXT NOT NULL,
    media_url TEXT,
    approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('draft', 'approved', 'rejected')),
    scheduled_publish_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security) on all tables
ALTER TABLE tenant_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_backlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_assets ENABLE ROW LEVEL SECURITY;

-- Simple multi-tenant RLS policies using metadata/tenant constraints.
-- In a real production application, these policies would query the auth.uid() or claims.
-- For development / admin tools using the service role key, RLS is bypassed.
-- Here we define template policies that require client matching if using authenticated users.

CREATE POLICY tenant_companies_isolation ON tenant_companies
    FOR ALL
    TO authenticated
    USING (id = (auth.jwt() ->> 'company_id')::UUID);

CREATE POLICY platform_configurations_isolation ON platform_configurations
    FOR ALL
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

CREATE POLICY content_backlog_isolation ON content_backlog
    FOR ALL
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

CREATE POLICY generated_assets_isolation ON generated_assets
    FOR ALL
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::UUID);
