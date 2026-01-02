import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ContextSource } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AddContextRequest {
  source: ContextSource;
  content: string;
  metadata?: Record<string, unknown>;
}

// POST /api/decisions/[id]/context - Add context to a decision
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: decision_id } = await params;
    const body: AddContextRequest = await request.json();

    // Validate required fields
    if (!body.source || !body.content) {
      return NextResponse.json(
        { error: 'Missing required fields: source, content' },
        { status: 400 }
      );
    }

    // Verify decision exists
    const { data: decision, error: decisionError } = await supabaseAdmin
      .from('decisions')
      .select('id')
      .eq('id', decision_id)
      .single();

    if (decisionError || !decision) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    // Insert context
    const { data, error } = await supabaseAdmin
      .from('contexts')
      .insert({
        id: uuidv4(),
        decision_id,
        source: body.source,
        content: body.content,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error adding context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
