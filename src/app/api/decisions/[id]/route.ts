import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// GET /api/decisions/[id] - Get a single decision with its contexts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate request
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { id } = await params;

    // Get decision
    const { data: decision, error: decisionError } = await supabaseAdmin
      .from('decisions')
      .select('*')
      .eq('id', id)
      .single();

    if (decisionError) {
      if (decisionError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
      }
      return NextResponse.json({ error: decisionError.message }, { status: 500 });
    }

    // Get associated contexts
    const { data: contexts, error: contextsError } = await supabaseAdmin
      .from('contexts')
      .select('*')
      .eq('decision_id', id)
      .order('created_at', { ascending: true });

    if (contextsError) {
      console.error('Error fetching contexts:', contextsError);
    }

    // Get any overrides
    const { data: overrides, error: overridesError } = await supabaseAdmin
      .from('overrides')
      .select('*')
      .eq('original_decision_id', id)
      .order('created_at', { ascending: true });

    if (overridesError) {
      console.error('Error fetching overrides:', overridesError);
    }

    return NextResponse.json({
      ...decision,
      contexts: contexts || [],
      overrides: overrides || [],
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching decision:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
