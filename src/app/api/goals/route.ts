import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CreateGoalRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// POST /api/goals - Create a new goal
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body: CreateGoalRequest = await request.json();

    if (!body.name || !body.priority) {
      return NextResponse.json(
        { error: 'Missing required fields: name, priority' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('goals')
      .insert({
        id: uuidv4(),
        organization_id: auth.organizationId,
        name: body.name,
        description: body.description,
        priority: body.priority,
        target_date: body.target_date,
        success_metrics: body.success_metrics || [],
        metadata: body.metadata || {},
        status: 'active',
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
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/goals - List goals
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    let query = supabaseAdmin
      .from('goals')
      .select('*')
      .order('priority')
      .order('name');

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
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
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
