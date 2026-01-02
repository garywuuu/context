-- Migration: Add Context Graph features
-- Capabilities, Goals, Enhanced Decisions, and Patterns

-- ============================================
-- 1. CAPABILITIES TABLE
-- Organizational capabilities (what the org can do)
-- ============================================
CREATE TABLE IF NOT EXISTS capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT, -- e.g., 'product', 'service', 'technical'
    strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak', 'none')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capabilities_org_isolation" ON capabilities
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- ============================================
-- 2. GOALS TABLE
-- Organizational goals (what the org wants to achieve)
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    target_date TIMESTAMPTZ,
    status TEXT CHECK (status IN ('active', 'achieved', 'abandoned')) DEFAULT 'active',
    success_metrics JSONB DEFAULT '[]', -- Array of metric definitions
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_org_isolation" ON goals
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- ============================================
-- 3. ADD COLUMNS TO DECISIONS TABLE
-- Enhanced decision tracking
-- ============================================
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS reasoning TEXT,
ADD COLUMN IF NOT EXISTS sources JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS linked_capabilities UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS linked_goals UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS source_weights JSONB DEFAULT '{}';

-- ============================================
-- 4. PATTERNS TABLE
-- Discovered patterns across decisions
-- ============================================
CREATE TABLE IF NOT EXISTS patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    pattern_type TEXT CHECK (pattern_type IN ('correlation', 'sequence', 'anomaly', 'success_factor')),
    conditions JSONB NOT NULL, -- When this pattern applies
    outcomes JSONB NOT NULL, -- What typically happens
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    sample_size INT DEFAULT 0, -- Number of decisions this is based on
    decision_ids UUID[] DEFAULT '{}', -- Sample decisions exhibiting this pattern
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patterns_org_isolation" ON patterns
    USING (organization_id = current_setting('app.organization_id')::uuid);

-- ============================================
-- 5. DECISION_CAPABILITY_LINKS TABLE
-- Many-to-many linking decisions to capabilities
-- ============================================
CREATE TABLE IF NOT EXISTS decision_capability_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    capability_id UUID NOT NULL REFERENCES capabilities(id) ON DELETE CASCADE,
    match_type TEXT CHECK (match_type IN ('strong', 'partial', 'mismatch')),
    auto_linked BOOLEAN DEFAULT true, -- Was this linked automatically?
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(decision_id, capability_id)
);

-- ============================================
-- 6. DECISION_GOAL_LINKS TABLE
-- Many-to-many linking decisions to goals
-- ============================================
CREATE TABLE IF NOT EXISTS decision_goal_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    relevance TEXT CHECK (relevance IN ('advances', 'neutral', 'hinders')),
    auto_linked BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(decision_id, goal_id)
);

-- ============================================
-- 7. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_capabilities_org ON capabilities(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_org ON goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_patterns_org ON patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_decision_capability_links_decision ON decision_capability_links(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_goal_links_decision ON decision_goal_links(decision_id);

-- ============================================
-- 8. UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER capabilities_updated_at
    BEFORE UPDATE ON capabilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER patterns_updated_at
    BEFORE UPDATE ON patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
