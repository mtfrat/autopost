-- 1. users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. generation_templates table
CREATE TABLE IF NOT EXISTS generation_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES tenant_companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand_colors TEXT,
    visual_style_guidelines TEXT,
    tone_modifier TEXT,
    platforms TEXT[] NOT NULL,
    skip_image BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_templates ENABLE ROW LEVEL SECURITY;

-- Add RLS policy templates (service role bypasses automatically)
CREATE POLICY users_isolation ON users
    FOR ALL
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

CREATE POLICY generation_templates_isolation ON generation_templates
    FOR ALL
    TO authenticated
    USING (company_id = (auth.jwt() ->> 'company_id')::UUID);
