import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractPolicyFromOverride } from '@/lib/embeddings';
import { CreateOverrideRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// POST /api/overrides - Record a human override (tacit knowledge capture!)
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body: CreateOverrideRequest = await request.json();

    // Validate required fields
    if (!body.original_decision_id || !body.correction || !body.human_explanation) {
      return NextResponse.json(
        { error: 'Missing required fields: original_decision_id, correction, human_explanation' },
        { status: 400 }
      );
    }

    // Get the original decision to extract policy
    const { data: originalDecision, error: decisionError } = await supabaseAdmin
      .from('decisions')
      .select('action_taken')
      .eq('id', body.original_decision_id)
      .single();

    if (decisionError || !originalDecision) {
      return NextResponse.json(
        { error: 'Original decision not found' },
        { status: 404 }
      );
    }

    // Attempt to extract a generalizable policy from the override
    // This is the "tacit knowledge extraction" magic
    let extracted_policy: string | null = null;
    try {
      extracted_policy = await extractPolicyFromOverride(
        originalDecision.action_taken,
        body.correction,
        body.human_explanation
      );
    } catch (extractError) {
      console.error('Failed to extract policy:', extractError);
      // Continue without extracted policy
    }

    // Insert override
    const { data, error } = await supabaseAdmin
      .from('overrides')
      .insert({
        id: uuidv4(),
        organization_id: auth.organizationId,
        original_decision_id: body.original_decision_id,
        correction: body.correction,
        human_explanation: body.human_explanation,
        extracted_policy,
        created_by: body.created_by,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error creating override:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/overrides - List all overrides (and extracted policies)
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const policies_only = searchParams.get('policies_only') === 'true';

    let query = supabaseAdmin
      .from('overrides')
      .select(`
        *,
        decisions:original_decision_id (
          agent_id,
          action_taken,
          context_snapshot
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter to only overrides with extracted policies
    if (policies_only) {
      query = query.not('extracted_policy', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching overrides:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
