import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEmbedding, createDecisionText } from '@/lib/embeddings';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import type { ExtractedDecision } from '@/types/v1';

// GET /api/review/[id] — Get single extracted decision
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from('extracted_decisions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Extracted decision not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching extracted decision:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/review/[id] — Review action (confirm, edit, dismiss)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { id } = await params;
    const body = await request.json();
    const { action, edits } = body as {
      action: 'confirm' | 'edit' | 'dismiss';
      edits?: {
        title?: string;
        rationale?: string;
        participants?: string[];
        alternatives?: { option: string; reason_rejected?: string }[];
      };
    };

    if (!action || !['confirm', 'edit', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be confirm, edit, or dismiss.' },
        { status: 400 }
      );
    }

    // Fetch the extracted decision
    const { data: extracted, error: fetchError } = await supabaseAdmin
      .from('extracted_decisions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Extracted decision not found' }, { status: 404 });
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const item = extracted as ExtractedDecision;

    // Handle dismiss
    if (action === 'dismiss') {
      const { error: updateError } = await supabaseAdmin
        .from('extracted_decisions')
        .update({
          status: 'dismissed',
          reviewed_by: auth.userId || auth.keyId || 'system',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error('Error dismissing decision:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Handle edit: apply edits to the extracted decision fields first
    if (action === 'edit' && edits) {
      if (edits.title) item.title = edits.title;
      if (edits.rationale) item.rationale = edits.rationale;
      if (edits.participants) item.participants = edits.participants;
      if (edits.alternatives) item.alternatives = edits.alternatives;
    }

    // Handle confirm / edit+confirm: create decision row with embedding
    const decisionId = uuidv4();

    const decisionText = createDecisionText({
      action_taken: item.title,
      context_snapshot: {
        source: item.source_type,
        channel: item.source_channel,
        participants: item.participants,
        rationale: item.rationale,
        alternatives: item.alternatives,
      },
    });

    let embedding: number[] | undefined;
    try {
      embedding = await generateEmbedding(decisionText);
    } catch (embeddingError) {
      console.error('Failed to generate embedding:', embeddingError);
      // Continue without embedding - can be backfilled later
    }

    const newDecision = {
      id: decisionId,
      organization_id: auth.organizationId,
      agent_id: 'slack-extraction',
      timestamp: item.source_timestamp || new Date().toISOString(),
      action_taken: item.title,
      confidence: item.confidence,
      context_snapshot: {
        source: item.source_type,
        channel: item.source_channel,
        participants: item.participants,
        alternatives: item.alternatives,
      },
      policies_evaluated: [],
      reasoning: item.rationale || item.title,
      sources: [
        {
          type: 'SLACK',
          content: item.rationale || item.title,
          weight: 1.0,
        },
      ],
      embedding,
    };

    // Insert the decision
    const { error: insertError } = await supabaseAdmin
      .from('decisions')
      .insert(newDecision);

    if (insertError) {
      console.error('Error creating decision:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update the extracted decision
    const updateData: Record<string, unknown> = {
      status: action === 'edit' ? 'edited' : 'confirmed',
      decision_id: decisionId,
      reviewed_by: auth.userId || auth.keyId || 'system',
      reviewed_at: new Date().toISOString(),
    };

    // If edited, also persist the edits back to extracted_decisions
    if (action === 'edit' && edits) {
      if (edits.title) updateData.title = edits.title;
      if (edits.rationale) updateData.rationale = edits.rationale;
      if (edits.participants) updateData.participants = edits.participants;
      if (edits.alternatives) updateData.alternatives = edits.alternatives;
    }

    const { error: updateError } = await supabaseAdmin
      .from('extracted_decisions')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating extracted decision:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, decision_id: decisionId });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error reviewing decision:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
