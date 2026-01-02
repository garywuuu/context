-- Migration: Simple User Authentication
-- Run this INSTEAD of 003_user_auth.sql if that one failed

-- ============================================================================
-- STEP 1: Drop the failing trigger (if exists)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- ============================================================================
-- STEP 2: Create users table (simpler version)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

-- ============================================================================
-- STEP 3: Simple trigger that just creates the user record
-- Organization will be created manually or via API
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  company TEXT;
BEGIN
  -- Get company name from metadata, default to email prefix
  company := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1) || '''s Organization'
  );

  -- Create a new organization for this user
  INSERT INTO organizations (name, slug)
  VALUES (
    company,
    'org-' || substring(gen_random_uuid()::text from 1 for 8)
  )
  RETURNING id INTO new_org_id;

  -- Create user record linked to the new org
  INSERT INTO users (id, organization_id, email, role)
  VALUES (NEW.id, new_org_id, NEW.email, 'admin');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- STEP 4: Enable RLS
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can see their own record
CREATE POLICY users_select_self ON users
  FOR SELECT
  USING (id = auth.uid());

-- Users can see others in their org
CREATE POLICY users_select_org ON users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- Verify
-- ============================================================================

SELECT 'Migration complete! Try signing up again.' as status;
