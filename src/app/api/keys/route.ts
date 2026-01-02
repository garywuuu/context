import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

// POST /api/keys - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate a secure API key
    const keyValue = `cg_${randomBytes(32).toString('hex')}`;
    const keyPrefix = keyValue.substring(0, 10);

    // Hash the key for storage
    const keyHash = await bcrypt.hash(keyValue, 10);

    // Store in database
    const { error: insertError } = await supabase
      .from('api_keys')
      .insert({
        organization_id: userData.organization_id,
        name: name.trim(),
        key_hash: keyHash,
        key_prefix: keyPrefix,
      });

    if (insertError) {
      console.error('Error creating API key:', insertError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    // Return the full key only once
    return NextResponse.json({
      key: keyValue,
      prefix: keyPrefix,
      name: name.trim(),
    });

  } catch (error) {
    console.error('Error in POST /api/keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/keys - List API keys for current user's org
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get API keys
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at, expires_at')
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false });

    if (keysError) {
      console.error('Error fetching API keys:', keysError);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    return NextResponse.json(keys);

  } catch (error) {
    console.error('Error in GET /api/keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
