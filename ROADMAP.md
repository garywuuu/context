# Context Graph Platform Roadmap

## Current State (MVP)
- Decision logging with semantic search
- Human override capture with policy extraction
- Python SDK (ready to publish)
- Next.js API + Supabase + pgvector

## Critical Gaps (Block Real Adoption)

### 1. Authentication & Multi-Tenancy
**Problem:** No way to isolate customer data or authenticate requests

**What's needed:**
- API key management (generate, rotate, revoke)
- Row-level security (RLS) in Supabase to isolate tenants
- Rate limiting per customer
- Usage tracking for billing

**Implementation:**
```sql
-- Add to schema
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON decisions
  USING (organization_id = current_setting('app.current_org_id')::uuid);
```

### 2. Policy Management System
**Problem:** Extracted policies just sit in a table - agents can't USE them

**What's needed:**
- Policy versioning (track changes over time)
- Policy application API (before agent decides, check relevant policies)
- Policy conflict resolution (what if policies contradict?)
- Policy effectiveness tracking (did following this policy improve outcomes?)

**User flow:**
```python
# Before making decision, get applicable policies
policies = cg.policies.get_applicable(
    agent_id="sales-agent",
    context={"customer_type": "enterprise", "deal_value": 500000}
)

# Agent uses these in decision-making
for policy in policies:
    print(f"Guideline: {policy.rule}")
    print(f"Confidence: {policy.effectiveness_score}")
```

### 3. Analytics & Observability
**Problem:** Can't see what's happening - no dashboards, metrics, or alerts

**What's needed:**
- Decision analytics (volume over time, confidence trends)
- Override rate metrics (how often are humans correcting?)
- Search effectiveness (are agents finding useful precedent?)
- Agent performance comparison (which agents need improvement?)
- Alerting (unusual patterns, low confidence spike, high override rate)

**Examples:**
- "Sales-agent-v2 has 40% override rate (vs 10% baseline)"
- "Confidence scores dropped 20% after policy update"
- "Top 5 most-overridden decisions this week"

### 4. Context Enrichment
**Problem:** Only captures what agent explicitly logs - missing rich context

**What's needed:**
- **Passive context ingestion** from:
  - Slack threads (capture human discussions about decisions)
  - CRM records (pull customer data automatically)
  - Email threads (context from customer communications)
  - Support tickets (issues that led to decision)

- **Context linking** (connect related decisions)
- **Timeline view** (see full decision history for a customer)

**API:**
```python
# Add context after decision is made
cg.decisions.add_context(
    decision_id="...",
    source="SLACK",
    content="Sarah: This customer is a flight risk, give them max discount",
    metadata={"channel": "#sales", "thread_id": "..."}
)
```

### 5. Integration SDKs
**Problem:** Only Python - most agent frameworks are multi-language

**What's needed:**
- TypeScript/JavaScript SDK (for LangChain.js, Node.js agents)
- LangChain integration (Python wrapper)
- CrewAI integration
- AutoGen integration
- OpenAI Assistants API integration

### 6. Decision Graph Visualization
**Problem:** Decisions are isolated - can't see relationships and patterns

**What's needed:**
- Graph view of related decisions
- Decision chains (this decision led to that decision)
- Common patterns extraction (these 10 decisions all followed same path)
- Anomaly detection (this decision is unusual compared to precedent)

## Scalability Improvements

### Database Layer

#### Current Limitations:
- Single Supabase instance (not horizontally scalable)
- OpenAI API calls in request path (slow, expensive)
- No caching layer
- No read replicas

#### Scalability Plan:

**Phase 1: Optimize Current Stack**
```typescript
// 1. Add Redis caching for searches
const cached = await redis.get(`search:${queryHash}`);
if (cached) return cached;

// 2. Move embedding generation to background queue
await queue.add('generate-embedding', { decisionId });

// 3. Add read replica for searches
const { data } = await supabaseReplica.from('decisions')...
```

**Phase 2: Horizontal Scaling**
- Move from Supabase to self-hosted Postgres + pgvector
- Use pgBouncer for connection pooling
- Add read replicas for search queries
- Use BullMQ/Inngest for async jobs

**Phase 3: Distributed Architecture**
```
┌─────────────┐
│   API GW    │ (rate limiting, auth)
└─────┬───────┘
      │
      ├─→ [Write API] → PostgreSQL Primary
      │
      ├─→ [Search API] → PostgreSQL Replicas (3x)
      │
      └─→ [Async Jobs]
           ├─→ Embedding generation (OpenAI)
           ├─→ Policy extraction (GPT-4)
           └─→ Analytics computation
```

### Embedding Generation

#### Current: Blocking OpenAI Calls
```typescript
// This blocks the request for ~200ms
const embedding = await openai.embeddings.create({...});
```

#### Scalable Approach:
```typescript
// 1. Accept decision without embedding
const decision = await db.insert({...});

// 2. Queue embedding generation
await queue.add('embeddings', {
  decisionId: decision.id,
  priority: 'normal'
});

// 3. Worker processes in background
// Can batch multiple decisions → single OpenAI call
const embeddings = await openai.embeddings.create({
  input: batch.map(d => d.text) // batch of 100
});
```

**Cost savings:** 100x faster, ~50% cheaper (batching)

### Search Performance

#### Current:
- Every search = OpenAI embedding + vector search
- No caching
- No query optimization

#### Optimizations:

**1. Semantic cache (90% hit rate possible)**
```typescript
// Cache search results by query
const cacheKey = `search:${query}:${agentId}`;
const cached = await redis.get(cacheKey);
if (cached && Date.now() - cached.timestamp < 3600000) {
  return cached.results; // 1 hour TTL
}
```

**2. Pre-compute common queries**
```sql
-- Materialized view for frequent searches
CREATE MATERIALIZED VIEW top_enterprise_discounts AS
SELECT * FROM decisions
WHERE context_snapshot->>'customer_type' = 'enterprise'
ORDER BY similarity_to('enterprise discount') DESC
LIMIT 100;

REFRESH MATERIALIZED VIEW CONCURRENTLY top_enterprise_discounts;
```

**3. Approximate nearest neighbor (ANN)**
```sql
-- Instead of exact pgvector search, use HNSW index
CREATE INDEX ON decisions
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 10x faster, 95% accuracy (vs 100% for exact)
```

### Infrastructure Scaling

#### Current: Single Vercel + Supabase
- Good for: <1000 decisions/day
- Cost: ~$25/month
- Limits: 500K vector ops/month, 8GB DB

#### Tier 2: Small Team ($1K-10K decisions/day)
```
Infrastructure:
- Vercel Pro ($20/month)
- Supabase Pro ($25/month)
- Upstash Redis ($10/month)
- Total: ~$55/month

Limits:
- 2M vector ops/month
- 100GB DB
- 10GB Redis
```

#### Tier 3: Growing Startup ($100K decisions/day)
```
Infrastructure:
- AWS/GCP self-hosted
  - PostgreSQL (db.r6g.xlarge): $250/month
  - Redis (cache.m5.large): $100/month
  - API servers (3x t3.medium): $150/month
  - Worker queue (2x t3.small): $60/month
- Total: ~$560/month

Optimizations needed:
- Read replicas (3x)
- Background job processing
- Embedding batching
- Query caching
```

#### Tier 4: Scale ($1M+ decisions/day)
```
Architecture:
- Multi-region deployment
- Dedicated embedding service (100 req/s)
- Separate search cluster (read-optimized)
- Event streaming (Kafka/RabbitMQ)
- Analytics warehouse (ClickHouse)

Infrastructure:
- API tier: 10 instances
- DB: Primary + 5 replicas
- Cache: Redis cluster (5 nodes)
- Workers: 20 instances
- Total: ~$5K/month
```

## Immediate Next Steps (Priority Order)

### P0: Essential for First Customer
1. **Authentication** - API key management + tenant isolation
2. **Policy retrieval API** - Make extracted policies usable
3. **Basic analytics dashboard** - Show decision volume, override rate

### P1: Critical for Scale
4. **Background job queue** - Move embeddings out of request path
5. **Redis caching** - Cache search results
6. **TypeScript SDK** - Support Node.js agents

### P2: Product Differentiation
7. **Context enrichment** - Slack/CRM/email integration
8. **Decision graph view** - Visualize relationships
9. **LangChain integration** - Drop-in compatibility

### P3: Enterprise Features
10. **SSO/SAML** - Enterprise auth
11. **Audit logs** - Compliance tracking
12. **SLA monitoring** - Uptime guarantees
13. **On-premise deployment** - For regulated industries

## Technical Debt to Address

### Code Quality
- [ ] Add input validation (zod schemas)
- [ ] Error handling middleware
- [ ] Structured logging (Axiom/Datadog)
- [ ] OpenAPI spec generation
- [ ] E2E tests for critical flows

### Performance
- [ ] Add database indexes (currently missing!)
- [ ] Optimize N+1 queries
- [ ] Add request tracing (OpenTelemetry)
- [ ] Load testing (k6/Artillery)

### Security
- [ ] SQL injection protection (parameterized queries)
- [ ] Rate limiting per API key
- [ ] DDoS protection (Cloudflare)
- [ ] Secrets management (Vault/AWS Secrets)
- [ ] Security headers (CORS, CSP)

## Cost Analysis

### Current MVP Cost (1K decisions/day)
- Supabase: $0 (free tier)
- Vercel: $0 (hobby tier)
- OpenAI embeddings: $0.001 * 1000 = $1/day = $30/month
- **Total: $30/month**

### At Scale (100K decisions/day)
- Supabase Pro: $25/month
- OpenAI embeddings: $0.001 * 100K = $100/day = $3K/month
- GPT-4 policy extraction: ~$500/month (assumes 5% override rate)
- Infrastructure: $500/month
- **Total: ~$4K/month**

### Optimization: Self-hosted embeddings
- Use open-source models (sentence-transformers)
- Cost: GPU instance ($200/month) vs OpenAI ($3K/month)
- **Savings: $2.8K/month (93% cheaper)**
- Trade-off: Slightly lower quality, ops overhead

## Revenue Model Implications

If selling at $0.01/decision:
- 100K decisions/day = $1K/day = $30K/month revenue
- Costs: $4K/month
- **Gross margin: 87%** ✅ Great SaaS margins

Critical to get right:
1. Authentication (enables billing)
2. Usage tracking (for pricing)
3. Async processing (cost efficiency)
