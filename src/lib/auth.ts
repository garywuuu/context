/**
 * Authentication middleware for Context Graph API
 * Supports both API keys (for SDK) and user sessions (for dashboard)
 */

import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase';
import { createServerClient } from '@supabase/ssr';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export class AuthenticationError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface AuthContext {
  organizationId: string;
  keyId?: string;
  userId?: string;
  scopes: string[];
  source: 'api_key' | 'session';
}

/**
 * Authenticate a request using either API key or user session
 */
export async function authenticate(request: NextRequest): Promise<AuthContext> {
  // Try API key first
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (apiKey) {
    return await authenticateWithApiKey(apiKey);
  }

  // Fall back to user session
  return await authenticateWithSession(request);
}

/**
 * Authenticate using API key (for SDK usage)
 */
async function authenticateWithApiKey(apiKey: string): Promise<AuthContext> {
  // Validate API key format
  if (!apiKey.startsWith('cg_')) {
    throw new AuthenticationError('Invalid API key format');
  }

  // Extract key prefix (first 12 characters)
  const prefix = apiKey.substring(0, 12);

  // Find API key by prefix
  const { data: keyRecord, error } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('key_prefix', prefix)
    .is('revoked_at', null)
    .single();

  if (error || !keyRecord) {
    throw new AuthenticationError('Invalid API key');
  }

  // Verify full key hash
  const isValid = await bcrypt.compare(apiKey, keyRecord.key_hash);

  if (!isValid) {
    throw new AuthenticationError('Invalid API key');
  }

  // Check if key is expired
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    throw new AuthenticationError('API key has expired');
  }

  // Update last_used_at timestamp (fire and forget)
  void supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id);

  // Return auth context
  return {
    organizationId: keyRecord.organization_id,
    keyId: keyRecord.id,
    scopes: keyRecord.scopes || ['read', 'write'],
    source: 'api_key',
  };
}

/**
 * Authenticate using user session (for dashboard)
 */
async function authenticateWithSession(request: NextRequest): Promise<AuthContext> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthenticationError('Not authenticated. Please log in.');
  }

  // Get user's organization
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new AuthenticationError('User not found in organization');
  }

  return {
    organizationId: userData.organization_id,
    userId: user.id,
    scopes: ['read', 'write'], // Users have full access to their org
    source: 'session',
  };
}

/**
 * Set organization context for Row Level Security (RLS)
 * Must be called before any database queries
 */
export async function setOrganizationContext(organizationId: string): Promise<void> {
  // Set session variable for RLS policies
  const { error } = await supabaseAdmin.rpc('set_org_context', {
    org_id: organizationId,
  });

  if (error) {
    console.error('Failed to set org context:', error);
    throw new Error('Failed to set organization context');
  }
}

/**
 * Check if auth context has required scope
 */
export function hasScope(auth: AuthContext, requiredScope: string): boolean {
  return auth.scopes.includes(requiredScope) || auth.scopes.includes('*');
}

/**
 * Require specific scope or throw error
 */
export function requireScope(auth: AuthContext, requiredScope: string): void {
  if (!hasScope(auth, requiredScope)) {
    throw new AuthenticationError(
      `Missing required scope: ${requiredScope}`,
      403
    );
  }
}
