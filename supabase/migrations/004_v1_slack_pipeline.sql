-- V1: Slack Pipeline + Decision Extraction Infrastructure

-- LLM provider configuration per org
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS llm_config JSONB DEFAULT '{}';

-- Integrations table (generic — supports Slack, future: meetings, GitHub, etc.)
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'error', 'revoked')),
  credentials JSONB NOT NULL DEFAULT '{}',
  settings JSONB NOT NULL DEFAULT '{}',
  connected_by UUID REFERENCES users(id),
  connected_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_integrations_org ON integrations(organization_id);
CREATE UNIQUE INDEX idx_integrations_org_provider ON integrations(organization_id, provider);
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_integrations ON integrations
  FOR ALL USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Slack channels selected for monitoring
CREATE TABLE IF NOT EXISTS slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  cursor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_slack_channels_unique ON slack_channels(integration_id, channel_id);
ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_slack_channels ON slack_channels
  FOR ALL USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Raw ingested Slack messages
CREATE TABLE IF NOT EXISTS slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  thread_ts TEXT,
  user_id TEXT,
  user_name TEXT,
  content TEXT NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_slack_messages_unique ON slack_messages(integration_id, channel_id, message_ts);
CREATE INDEX idx_slack_messages_thread ON slack_messages(integration_id, thread_ts);
ALTER TABLE slack_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_slack_messages ON slack_messages
  FOR ALL USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Extracted decisions (review queue)
CREATE TABLE IF NOT EXISTS extracted_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'slack',
  source_channel TEXT,
  source_thread_ts TEXT,
  source_url TEXT,
  source_message_ids UUID[],
  title TEXT NOT NULL,
  rationale TEXT,
  participants TEXT[],
  alternatives JSONB DEFAULT '[]',
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  raw_extraction JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'edited', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  decision_id UUID REFERENCES decisions(id),
  extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_timestamp TIMESTAMPTZ
);

CREATE INDEX idx_extracted_decisions_org_status ON extracted_decisions(organization_id, status);
CREATE INDEX idx_extracted_decisions_org_date ON extracted_decisions(organization_id, extracted_at DESC);
ALTER TABLE extracted_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_extracted_decisions ON extracted_decisions
  FOR ALL USING (organization_id = current_setting('app.current_org_id', true)::uuid);

-- Trigger for integrations updated_at
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
