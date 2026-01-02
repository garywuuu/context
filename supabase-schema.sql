-- Context Graph MVP Schema for Supabase
-- Run this in Supabase SQL Editor to set up your database

-- Enable pgvector extension for semantic search
create extension if not exists vector;

-- Decisions table: Core decision traces logged by agents
create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  "timestamp" timestamptz not null default now(),
  action_taken text not null,
  confidence float not null check (confidence >= 0 and confidence <= 1),
  context_snapshot jsonb not null default '{}',
  policies_evaluated jsonb not null default '[]',
  outcome text,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamptz not null default now()
);

-- Contexts table: Additional context attached to decisions
create table if not exists contexts (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  source text not null check (source in ('CRM', 'EMAIL', 'SLACK', 'DOCUMENT', 'AGENT_REASONING', 'HUMAN_INPUT', 'API', 'OTHER')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Overrides table: Human corrections to agent decisions (tacit knowledge!)
create table if not exists overrides (
  id uuid primary key default gen_random_uuid(),
  original_decision_id uuid not null references decisions(id) on delete cascade,
  correction text not null,
  human_explanation text not null,
  extracted_policy text, -- LLM-extracted generalizable rule
  created_by text,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists decisions_agent_id_idx on decisions(agent_id);
create index if not exists decisions_timestamp_idx on decisions("timestamp" desc);
create index if not exists contexts_decision_id_idx on contexts(decision_id);
create index if not exists overrides_decision_id_idx on overrides(original_decision_id);

-- Vector similarity search index (IVFFlat for good performance)
create index if not exists decisions_embedding_idx on decisions
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Function to search for similar decisions
create or replace function search_similar_decisions(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 10,
  filter_agent_id text default null
)
returns table (
  id uuid,
  agent_id text,
  "timestamp" timestamptz,
  action_taken text,
  confidence float,
  context_snapshot jsonb,
  policies_evaluated jsonb,
  outcome text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.agent_id,
    d."timestamp",
    d.action_taken,
    d.confidence,
    d.context_snapshot,
    d.policies_evaluated,
    d.outcome,
    1 - (d.embedding <=> query_embedding) as similarity
  from decisions d
  where
    d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) > match_threshold
    and (filter_agent_id is null or d.agent_id = filter_agent_id)
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RLS (Row Level Security) - enable if you want multi-tenant isolation
-- For MVP, we'll keep it simple without RLS
-- Uncomment these if you want to enable it later:

-- alter table decisions enable row level security;
-- alter table contexts enable row level security;
-- alter table overrides enable row level security;

-- Example RLS policy (requires auth):
-- create policy "Users can only see their org's decisions"
--   on decisions for select
--   using (auth.jwt() ->> 'org_id' = decisions.org_id);
