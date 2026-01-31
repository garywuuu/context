import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateEmbedding, createDecisionText } from '@/lib/embeddings';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import type { ExtractedDecision } from '@/types/v1';

// POST /api/review/bulk — Bulk review actions
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body = await request.json();
    const { action, ids } = body as {
      action: 'confirm' | 'dismiss';
      ids: string[];
    };

    if (!action || !['confirm', 'dismiss'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be confirm or dismiss.' },
        { status: 400 }
      );
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'ids must be a non-empty array.' },
        { status: 400 }
      );
    }

    // Fetch all extracted decisions by IDs
    const { data: items, error: fetchError } = await supabaseAdmin
      .from('extracted_decisions')
      .select('*')
      .in('id', ids);

    if (fetchError) {
      console.error('Error fetching extracted decisions:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No matching extracted decisions found.' },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const reviewedBy = auth.userId || auth.keyId || 'system';

    // Handle dismiss
    if (action === 'dismiss') {
      const { error: updateError } = await supabaseAdmin
        .from('extracted_decisions')
        .update({
          status: 'dismissed',
          reviewed_by: reviewedBy,
          reviewed_at: now,
        })
        .in('id', ids);

      if (updateError) {
        console.error('Error bulk dismissing:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        processed: items.length,
      });
    }

    // Handle confirm — process each item individually (need embeddings per decision)
    const decisionIds: string[] = [];
    let processed = 0;

    for (const raw of items) {
      const extracted = raw as ExtractedDecision;

      try {
        const decisionId = uuidv4();

        const decisionText = createDecisionText({
          action_taken: extracted.title,
          context_snapshot: {
            source: extracted.source_type,
            channel: extracted.source_channel,
            participants: extracted.participants,
            rationale: extracted.rationale,
            alternatives: extracted.alternatives,
          },
        });

        let embedding: number[] | undefined;
        try {
          embedding = await generateEmbedding(decisionText);
        } catch (embeddingError) {
          console.error('Failed to generate embedding for bulk item:', embeddingError);
          // Continue without embedding
        }

        const newDecision = {
          id: decisionId,
          organization_id: auth.organizationId,
          agent_id: 'slack-extraction',
          timestamp: extracted.source_timestamp || now,
          action_taken: extracted.title,
          confidence: extracted.confidence,
          context_snapshot: {
            source: extracted.source_type,
            channel: extracted.source_channel,
            participants: extracted.participants,
            alternatives: extracted.alternatives,
          },
          policies_evaluated: [],
          reasoning: extracted.rationale || extracted.title,
          sources: [
            {
              type: 'SLACK',
              content: extracted.rationale || extracted.title,
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
          console.error(`Error creating decision for ${extracted.id}:`, insertError);
          continue;
        }

        // Update the extracted decision
        const { error: updateError } = await supabaseAdmin
          .from('extracted_decisions')
          .update({
            status: 'confirmed',
            decision_id: decisionId,
            reviewed_by: reviewedBy,
            reviewed_at: now,
          })
          .eq('id', extracted.id);

        if (updateError) {
          console.error(`Error updating extracted decision ${extracted.id}:`, updateError);
          continue;
        }

        decisionIds.push(decisionId);
        processed++;
      } catch (itemError) {
        console.error(`Error processing bulk item ${extracted.id}:`, itemError);
        continue;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      decision_ids: decisionIds,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error bulk reviewing decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
