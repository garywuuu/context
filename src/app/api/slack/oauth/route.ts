import { NextRequest, NextResponse } from 'next/server';
import { authenticate, AuthenticationError } from '@/lib/auth';
import { getSlackOAuthURL } from '@/lib/slack';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Authenticate - user must be logged in to connect Slack
    await authenticate(request);

    // Generate a random state parameter to prevent CSRF
    const state = crypto.randomBytes(32).toString('hex');

    // Build the Slack OAuth URL
    const url = getSlackOAuthURL(state);

    // Create response with redirect
    const response = NextResponse.redirect(url);

    // Store state in a cookie for verification in the callback
    response.cookies.set('slack_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.redirect(
        new URL('/login?redirect=/settings/integrations', request.url)
      );
    }
    console.error('Slack OAuth initiation error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=oauth_failed', request.url)
    );
  }
}
