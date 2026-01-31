-- V1: Vector similarity search RPC for RAG query interface

CREATE OR REPLACE FUNCTION match_decisions(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  action_taken text,
  reasoning text,
  outcome text,
  confidence float,
  timestamp timestamptz,
  context_snapshot jsonb,
  sources jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.action_taken,
    d.reasoning,
    d.outcome,
    d.confidence,
    d.timestamp,
    d.context_snapshot,
    d.sources,
    1 - (d.embedding <=> query_embedding) as similarity
  FROM decisions d
  WHERE d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;
