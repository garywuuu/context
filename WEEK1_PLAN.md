# Week 1: Authentication, Multi-tenancy & Policy API

## Day 1-2: Authentication & Multi-Tenancy

### Database Schema Changes

```sql
-- 1. Organizations table (tenants)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- 2. API Keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_prefix TEXT NOT NULL, -- e.g., "cg_live_abc123"
  key_hash TEXT NOT NULL UNIQUE, -- bcrypt hash of full key
  name TEXT, -- e.g., "Production", "Staging"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT ARRAY['read', 'write'],
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- 3. Update existing tables to add organization_id
ALTER TABLE decisions ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE overrides ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE contexts ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create indexes for performance
CREATE INDEX idx_decisions_org ON decisions(organization_id);
CREATE INDEX idx_decisions_agent ON decisions(agent_id);
CREATE INDEX idx_decisions_timestamp ON decisions(timestamp);
CREATE INDEX idx_overrides_org ON overrides(organization_id);
CREATE INDEX idx_contexts_org ON contexts(organization_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own org's data
CREATE POLICY tenant_isolation_decisions ON decisions
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation_overrides ON overrides
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY tenant_isolation_contexts ON contexts
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);
```

### API Key Format

```
Format: cg_{env}_{random}
Examples:
- cg_live_sk_abc123def456ghi789  (production)
- cg_test_sk_xyz789uvw456rst123  (development)

Prefix: First 12 chars (cg_live_sk_a)
Hash: bcrypt of full key
```

### Authentication Flow

```typescript
// middleware/auth.ts
export async function authenticate(request: Request) {
  // 1. Extract API key from header
  const apiKey = request.headers.get('x-api-key') ||
                 request.headers.get('authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    throw new AuthenticationError('Missing API key');
  }

  // 2. Get key prefix (first 12 chars)
  const prefix = apiKey.substring(0, 12);

  // 3. Find key by prefix
  const keyRecord = await db.query(
    'SELECT * FROM api_keys WHERE key_prefix = $1 AND revoked_at IS NULL',
    [prefix]
  );

  if (!keyRecord) {
    throw new AuthenticationError('Invalid API key');
  }

  // 4. Verify hash
  const isValid = await bcrypt.compare(apiKey, keyRecord.key_hash);

  if (!isValid) {
    throw new AuthenticationError('Invalid API key');
  }

  // 5. Check expiration
  if (keyRecord.expires_at && new Date() > keyRecord.expires_at) {
    throw new AuthenticationError('API key expired');
  }

  // 6. Update last_used_at
  await db.query(
    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
    [keyRecord.id]
  );

  // 7. Set organization context for RLS
  await db.query(
    `SET LOCAL app.current_org_id = '${keyRecord.organization_id}'`
  );

  return {
    organizationId: keyRecord.organization_id,
    keyId: keyRecord.id,
    scopes: keyRecord.scopes,
  };
}
```

### Updated API Routes

```typescript
// src/app/api/decisions/route.ts
export async function POST(request: NextRequest) {
  // Authenticate and get org context
  const auth = await authenticate(request);

  const body = await request.json();

  const decision = await supabaseAdmin
    .from('decisions')
    .insert({
      ...body,
      organization_id: auth.organizationId, // Add org ID
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  return NextResponse.json(decision);
}
```

## Day 3-4: Policy Retrieval API

### Database Schema for Policies

```sql
-- Enhanced overrides table becomes policies table
CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

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
  effectiveness_score FLOAT, -- Computed: positive / (positive + negative)

  -- Versioning
  supersedes_policy_id UUID REFERENCES policies(id),

  UNIQUE(organization_id, rule)
);

CREATE INDEX idx_policies_org_agent ON policies(organization_id, agent_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_policies_context ON policies USING gin(context_filters);

-- Enable RLS
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policies ON policies
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);
```

### Policy Retrieval API

```typescript
// POST /api/policies/applicable
// Returns policies that match the current decision context

interface GetPoliciesRequest {
  agent_id: string;
  context: Record<string, any>; // e.g., {customer_type: "enterprise", deal_value: 500000}
}

interface PolicyMatch {
  policy: Policy;
  relevance_score: number; // How well context matches
  effectiveness_score: number; // Historical success rate
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  const { agent_id, context } = await request.json();

  // Find policies that match:
  // 1. Same organization
  // 2. Agent-specific OR global (agent_id IS NULL)
  // 3. Context filters match (JSON contains check)
  // 4. Status = 'active'

  const { data: policies } = await supabaseAdmin
    .from('policies')
    .select('*')
    .eq('organization_id', auth.organizationId)
    .eq('status', 'active')
    .or(`agent_id.eq.${agent_id},agent_id.is.null`)
    .order('effectiveness_score', { ascending: false })
    .limit(10);

  // Filter and score by context match
  const matches = policies
    .map(policy => ({
      policy,
      relevance_score: computeContextMatch(policy.context_filters, context),
      effectiveness_score: policy.effectiveness_score || 0.5,
    }))
    .filter(m => m.relevance_score > 0.3) // Minimum 30% match
    .sort((a, b) => b.relevance_score - a.relevance_score);

  return NextResponse.json({ matches });
}

function computeContextMatch(
  filters: Record<string, any>,
  context: Record<string, any>
): number {
  if (!filters || Object.keys(filters).length === 0) {
    return 1.0; // Global policy, always matches
  }

  let matchCount = 0;
  let totalFilters = Object.keys(filters).length;

  for (const [key, value] of Object.entries(filters)) {
    if (context[key] === value) {
      matchCount++;
    }
  }

  return matchCount / totalFilters;
}
```

### SDK Updates

```python
# Add to SDK: src/context_graph/resources/policies.py

class PolicyMatch(BaseModel):
    policy: Policy
    relevance_score: float
    effectiveness_score: float

class SyncPoliciesResource:
    def get_applicable(
        self,
        agent_id: str,
        context: Dict[str, Any],
    ) -> List[PolicyMatch]:
        """Get policies applicable to current decision context."""
        response = self._http.post(
            "/api/policies/applicable",
            json={"agent_id": agent_id, "context": context},
        )
        return [PolicyMatch(**m) for m in response["matches"]]

# Usage in agent code:
policies = cg.policies.get_applicable(
    agent_id="sales-agent",
    context={
        "customer_type": "enterprise",
        "deal_value": 500000,
        "churn_risk": "high"
    }
)

for match in policies:
    print(f"[{match.relevance_score:.0%}] {match.policy.rule}")
    print(f"  Effectiveness: {match.effectiveness_score:.0%}")
```

## Day 5: Basic Analytics Dashboard

### Analytics Queries

```sql
-- 1. Decision volume over time
SELECT
  DATE_TRUNC('day', timestamp) as date,
  agent_id,
  COUNT(*) as decision_count,
  AVG(confidence) as avg_confidence
FROM decisions
WHERE organization_id = $1
  AND timestamp > NOW() - INTERVAL '30 days'
GROUP BY date, agent_id
ORDER BY date DESC;

-- 2. Override rate by agent
SELECT
  d.agent_id,
  COUNT(DISTINCT d.id) as total_decisions,
  COUNT(DISTINCT o.id) as overridden_decisions,
  ROUND(COUNT(DISTINCT o.id)::numeric / COUNT(DISTINCT d.id) * 100, 2) as override_rate_pct
FROM decisions d
LEFT JOIN overrides o ON o.original_decision_id = d.id
WHERE d.organization_id = $1
  AND d.timestamp > NOW() - INTERVAL '30 days'
GROUP BY d.agent_id
ORDER BY override_rate_pct DESC;

-- 3. Most common decision types
SELECT
  action_taken,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM decisions
WHERE organization_id = $1
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY action_taken
ORDER BY count DESC
LIMIT 20;

-- 4. Policy effectiveness
SELECT
  p.rule,
  p.times_applied,
  p.positive_outcomes,
  p.negative_outcomes,
  p.effectiveness_score
FROM policies p
WHERE p.organization_id = $1
  AND p.status = 'active'
ORDER BY p.effectiveness_score DESC NULLS LAST
LIMIT 10;
```

### Dashboard UI Components

```typescript
// src/app/dashboard/page.tsx

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1>Context Graph Analytics</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <MetricCard
          title="Decisions (30d)"
          value="12,453"
          change="+23%"
        />
        <MetricCard
          title="Override Rate"
          value="8.2%"
          change="-2.1%"
          trend="down-good"
        />
        <MetricCard
          title="Avg Confidence"
          value="87.3%"
          change="+4.2%"
        />
        <MetricCard
          title="Active Policies"
          value="47"
          change="+5"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        <DecisionVolumeChart />
        <ConfidenceTrendChart />
        <OverrideRateByAgent />
        <TopPolicies />
      </div>
    </div>
  );
}
```

## Implementation Order

### Day 1: Database & Auth
1. Add organizations + api_keys tables
2. Add organization_id to existing tables
3. Create indexes
4. Enable RLS policies

### Day 2: Auth Middleware
5. Build auth middleware
6. Add to all API routes
7. Create API key generation script
8. Test authentication flow

### Day 3: Policy Schema
9. Create policies table
10. Migrate overrides → policies
11. Build /api/policies/applicable endpoint

### Day 4: Policy SDK
12. Add policies resource to Python SDK
13. Add TypeScript types
14. Test policy retrieval flow

### Day 5: Analytics
15. Build analytics queries
16. Create dashboard UI
17. Add charts
18. Deploy!

## Testing Checklist

- [ ] Create org + API key works
- [ ] API key authentication works
- [ ] Invalid API key rejected
- [ ] RLS isolates tenant data
- [ ] Policy retrieval matches context correctly
- [ ] Analytics queries return correct data
- [ ] Dashboard renders without errors

## Success Criteria

After Week 1, you should be able to:
1. ✅ Give customers API keys
2. ✅ Their data is isolated
3. ✅ Agents can retrieve applicable policies
4. ✅ View analytics dashboard
5. ✅ Ready to onboard first customer
