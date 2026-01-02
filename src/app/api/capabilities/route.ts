import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { CreateCapabilityRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// POST /api/capabilities - Create a new capability
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body: CreateCapabilityRequest = await request.json();

    if (!body.name || !body.strength) {
      return NextResponse.json(
        { error: 'Missing required fields: name, strength' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('capabilities')
      .insert({
        id: uuidv4(),
        organization_id: auth.organizationId,
        name: body.name,
        description: body.description,
        category: body.category,
        strength: body.strength,
        metadata: body.metadata || {},
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
    console.error('Error creating capability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/capabilities - List capabilities
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabaseAdmin
      .from('capabilities')
      .select('*')
      .order('name');

    if (category) {
      query = query.eq('category', category);
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
    console.error('Error fetching capabilities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
