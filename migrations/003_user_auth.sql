-- Migration: User Authentication with Supabase Auth
-- Links Supabase Auth users to organizations

-- ============================================================================
-- PART 1: Users Table (extends Supabase auth.users)
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'viewer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Links Supabase Auth users to organizations with roles';

-- Indexes
CREATE INDEX idx_users_org ON users(organization_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- PART 2: User Invitations (for team management)
-- ============================================================================

CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,

  UNIQUE(organization_id, email)
);

COMMENT ON TABLE user_invitations IS 'Pending team member invitations';

-- ============================================================================
-- PART 3: Trigger to auto-create user record after signup
-- ============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  invitation RECORD;
  new_org_id UUID;
BEGIN
  -- Check if user has a pending invitation
  SELECT * INTO invitation
  FROM user_invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ORDER BY invited_at DESC
  LIMIT 1;

  IF invitation IS NOT NULL THEN
    -- User was invited, join their organization
    INSERT INTO users (id, organization_id, role)
    VALUES (NEW.id, invitation.organization_id, invitation.role);

    -- Mark invitation as accepted
    UPDATE user_invitations
    SET accepted_at = NOW()
    WHERE id = invitation.id;
  ELSE
    -- First user, create new organization
    INSERT INTO organizations (name, slug)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Organization'),
      'org-' || substring(NEW.id::text from 1 for 8)
    )
    RETURNING id INTO new_org_id;

    -- Create user as admin of new org
    INSERT INTO users (id, organization_id, role)
    VALUES (NEW.id, new_org_id, 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- PART 4: RLS Policies for Users Table
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all users in their organization
CREATE POLICY users_select_own_org ON users
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Only admins can update user roles
CREATE POLICY users_update_admins_only ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND organization_id = users.organization_id
        AND role = 'admin'
    )
  );

-- ============================================================================
-- PART 5: Helper Functions
-- ============================================================================

-- Get current user's organization ID
CREATE OR REPLACE FUNCTION current_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- PART 6: Update API Keys RLS for user access
-- ============================================================================

-- Users can view their organization's API keys
CREATE POLICY api_keys_select_own_org ON api_keys
  FOR SELECT
  USING (
    organization_id = current_user_org_id()
  );

-- Only admins can create/revoke API keys
CREATE POLICY api_keys_insert_admins ON api_keys
  FOR INSERT
  WITH CHECK (
    organization_id = current_user_org_id() AND is_admin()
  );

CREATE POLICY api_keys_update_admins ON api_keys
  FOR UPDATE
  USING (
    organization_id = current_user_org_id() AND is_admin()
  );

-- Enable RLS on api_keys (if not already enabled)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 7: Test Data (Optional - for development)
-- ============================================================================

-- Note: In production, users will be created via Supabase Auth
-- This is just for testing the schema

COMMENT ON TABLE users IS 'Run this migration in Supabase SQL Editor';
