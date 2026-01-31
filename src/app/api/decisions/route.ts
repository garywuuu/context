import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEmbedding, createDecisionText } from '@/lib/embeddings';
import { CreateDecisionRequest, Decision } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// POST /api/decisions - Log a new decision
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body: CreateDecisionRequest = await request.json();

    // Validate required fields
    if (!body.agent_id || !body.action_taken || body.confidence === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, action_taken, confidence' },
        { status: 400 }
      );
    }

    // Create decision record
    const decision: Partial<Decision> = {
      id: uuidv4(),
      agent_id: body.agent_id,
      timestamp: new Date().toISOString(),
      action_taken: body.action_taken,
      confidence: body.confidence,
      context_snapshot: body.context_snapshot || {},
      policies_evaluated: body.policies_evaluated || [],
      outcome: body.outcome,
      reasoning: body.reasoning,
      sources: body.sources || [],
    };

    // Generate embedding for semantic search
    const decisionText = createDecisionText({
      action_taken: body.action_taken,
      context_snapshot: body.context_snapshot || {},
      policies_evaluated: body.policies_evaluated,
      outcome: body.outcome,
    });

    try {
      decision.embedding = await generateEmbedding(decisionText);
    } catch (embeddingError) {
      console.error('Failed to generate embedding:', embeddingError);
      // Continue without embedding - can be backfilled later
    }

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('decisions')
      .insert({
        id: decision.id,
        organization_id: auth.organizationId,
        agent_id: decision.agent_id,
        timestamp: decision.timestamp,
        action_taken: decision.action_taken,
        confidence: decision.confidence,
        context_snapshot: decision.context_snapshot,
        policies_evaluated: decision.policies_evaluated,
        outcome: decision.outcome,
        embedding: decision.embedding,
        reasoning: decision.reasoning,
        sources: decision.sources,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error creating decision:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/decisions - List decisions (with optional filters, search, pagination)
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const agent_id = searchParams.get('agent_id');
    const query_text = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Count query (same filters, no pagination)
    let countQuery = supabaseAdmin
      .from('decisions')
      .select('*', { count: 'exact', head: true });

    // Data query
    let dataQuery = supabaseAdmin
      .from('decisions')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (agent_id) {
      countQuery = countQuery.eq('agent_id', agent_id);
      dataQuery = dataQuery.eq('agent_id', agent_id);
    }

    if (query_text) {
      const filter = `action_taken.ilike.%${query_text}%,reasoning.ilike.%${query_text}%`;
      countQuery = countQuery.or(filter);
      dataQuery = dataQuery.or(filter);
    }

    const [{ count, error: countError }, { data, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (error || countError) {
      return NextResponse.json({ error: (error || countError)!.message }, { status: 500 });
    }

    return NextResponse.json({ decisions: data || [], total: count || 0 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
