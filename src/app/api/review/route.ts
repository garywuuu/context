import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// GET /api/review — List extracted decisions for review
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build count query
    let countQuery = supabaseAdmin
      .from('extracted_decisions')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let dataQuery = supabaseAdmin
      .from('extracted_decisions')
      .select('*')
      .order('extracted_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter (unless 'all')
    if (status !== 'all') {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    const [{ count, error: countError }, { data, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (error || countError) {
      console.error('Error fetching extracted decisions:', error || countError);
      return NextResponse.json(
        { error: (error || countError)!.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: data || [],
      total: count || 0,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching review items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
