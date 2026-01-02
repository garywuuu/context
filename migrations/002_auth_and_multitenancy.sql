-- Migration: Authentication & Multi-tenancy
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Organizations (Tenants)
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations (customers)';

-- ============================================================================
-- PART 2: API Keys
-- ============================================================================

CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Key management
  key_prefix TEXT NOT NULL, -- e.g., "cg_live_sk_a"
  key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of full key

  -- Metadata
  name TEXT, -- e.g., "Production", "Staging"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Permissions
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE api_keys IS 'API keys for authentication';

-- Indexes for performance
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_revoked ON api_keys(revoked_at) WHERE revoked_at IS NULL;

-- ============================================================================
-- PART 3: Add organization_id to existing tables
-- ============================================================================

ALTER TABLE decisions ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE overrides ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE contexts ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create indexes for performance
CREATE INDEX idx_decisions_org ON decisions(organization_id);
CREATE INDEX idx_decisions_org_agent ON decisions(organization_id, agent_id);
CREATE INDEX idx_decisions_org_timestamp ON decisions(organization_id, "timestamp");
CREATE INDEX idx_decisions_agent ON decisions(agent_id);
CREATE INDEX idx_decisions_timestamp ON decisions("timestamp");

CREATE INDEX idx_overrides_org ON overrides(organization_id);
CREATE INDEX idx_overrides_decision ON overrides(original_decision_id);

CREATE INDEX idx_contexts_org ON contexts(organization_id);
CREATE INDEX idx_contexts_decision ON contexts(decision_id);

-- ============================================================================
-- PART 4: Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their own organization
CREATE POLICY tenant_isolation_decisions ON decisions
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation_overrides ON overrides
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation_contexts ON contexts
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- ============================================================================
-- PART 5: Policies Table (for extracted policies)
-- ============================================================================

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Policy content
  rule TEXT NOT NULL, -- The extracted generalizable rule
  source_override_id UUID REFERENCES overrides(id), -- Where it came from

  -- Application context
  agent_id TEXT, -- Which agent this applies to (null = all agents)
  context_filters JSONB, -- e.g., {"customer_type": "enterprise"}

  -- Metadata
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- active, archived, draft
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  -- Effectiveness tracking
  times_applied INTEGER DEFAULT 0,
  positive_outcomes INTEGER DEFAULT 0,
  negative_outcomes INTEGER DEFAULT 0,
  effectiveness_score FLOAT GENERATED ALWAYS AS (
    CASE
      WHEN (positive_outcomes + negative_outcomes) > 0
      THEN positive_outcomes::float / (positive_outcomes + negative_outcomes)
      ELSE NULL
    END
  ) STORED,

  -- Versioning
  supersedes_policy_id UUID REFERENCES policies(id)
);

COMMENT ON TABLE policies IS 'Extracted policies from human overrides';

-- Indexes
CREATE INDEX idx_policies_org_agent ON policies(organization_id, agent_id);
CREATE INDEX idx_policies_org_status ON policies(organization_id, status);
CREATE INDEX idx_policies_context ON policies USING gin(context_filters);
CREATE INDEX idx_policies_effectiveness ON policies(effectiveness_score DESC NULLS LAST);

-- RLS
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policies ON policies
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- ============================================================================
-- PART 6: Helper Functions
-- ============================================================================

-- Function to set organization context for RLS
CREATE OR REPLACE FUNCTION set_org_context(org_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_org_id', org_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create policy when override is created
CREATE OR REPLACE FUNCTION create_policy_from_override()
RETURNS TRIGGER AS $$
BEGIN
  -- If override has an extracted_policy, create a policy entry
  IF NEW.extracted_policy IS NOT NULL AND NEW.extracted_policy != '' THEN
    INSERT INTO policies (
      organization_id,
      rule,
      source_override_id,
      agent_id,
      created_by
    )
    SELECT
      d.organization_id,
      NEW.extracted_policy,
      NEW.id,
      d.agent_id,
      NEW.created_by
    FROM decisions d
    WHERE d.id = NEW.original_decision_id
    ON CONFLICT DO NOTHING; -- Prevent duplicate policies
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create policies
CREATE TRIGGER trigger_create_policy_from_override
  AFTER INSERT ON overrides
  FOR EACH ROW
  EXECUTE FUNCTION create_policy_from_override();

-- ============================================================================
-- PART 7: Test Data (Optional - for development)
-- ============================================================================

-- Create a test organization
INSERT INTO organizations (id, name, slug)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Organization',
  'test-org'
);

-- Create a test API key
-- Note: In production, use bcrypt to hash the key
-- For now, we'll add a placeholder - you'll need to generate real keys via API
INSERT INTO api_keys (organization_id, key_prefix, key_hash, name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'cg_test_sk_',
  'PLACEHOLDER_HASH', -- Replace with bcrypt hash
  'Development Key'
);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check that everything was created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

-- Check indexes
-- SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname;

-- Check RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
