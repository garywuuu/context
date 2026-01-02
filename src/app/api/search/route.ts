import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/embeddings';
import { SearchRequest } from '@/types';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// POST /api/search - Semantic search for similar decisions
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body: SearchRequest = await request.json();

    // Validate required fields
    if (!body.query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      );
    }

    const limit = body.limit || 10;
    const threshold = body.threshold || 0.7;

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(body.query);

    // Call the Supabase function for vector similarity search
    const { data: decisions, error } = await supabaseAdmin.rpc(
      'search_similar_decisions',
      {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
        filter_agent_id: body.agent_id || null,
      }
    );

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch contexts for each matched decision
    const decisionsWithContext = await Promise.all(
      (decisions || []).map(async (decision: Record<string, unknown>) => {
        const { data: contexts } = await supabaseAdmin
          .from('contexts')
          .select('*')
          .eq('decision_id', decision.id)
          .order('created_at', { ascending: true });

        return {
          decision,
          similarity: decision.similarity,
          contexts: contexts || [],
        };
      })
    );

    return NextResponse.json({
      query: body.query,
      results: decisionsWithContext,
      count: decisionsWithContext.length,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error searching decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/search - Simple text search (fallback if no embedding)
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const agent_id = searchParams.get('agent_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required query parameter: q' },
        { status: 400 }
      );
    }

    // Text search fallback using ILIKE
    let dbQuery = supabaseAdmin
      .from('decisions')
      .select('*')
      .or(`action_taken.ilike.%${query}%,outcome.ilike.%${query}%`)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (agent_id) {
      dbQuery = dbQuery.eq('agent_id', agent_id);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      query,
      results: data,
      count: data?.length || 0,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error searching decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
