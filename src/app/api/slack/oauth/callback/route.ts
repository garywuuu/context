import { NextRequest, NextResponse } from 'next/server';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request: NextRequest) {
  try {
    // Authenticate - user must have an active session
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle Slack-side errors (user denied, etc.)
    if (error) {
      console.error('Slack OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${error}`, request.url)
      );
    }

    // Verify state parameter from cookie
    const storedState = request.cookies.get('slack_oauth_state')?.value;

    if (!state || !storedState || state !== storedState) {
      console.error('Slack OAuth state mismatch');
      return NextResponse.redirect(
        new URL('/settings/integrations?error=state_mismatch', request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_code', request.url)
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.ok) {
      console.error('Slack token exchange failed:', tokenData.error);
      return NextResponse.redirect(
        new URL(`/settings/integrations?error=${tokenData.error}`, request.url)
      );
    }

    // Check if an integration already exists for this org + team
    const { data: existing } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('organization_id', auth.organizationId)
      .eq('provider', 'slack')
      .single();

    const integrationData = {
      organization_id: auth.organizationId,
      provider: 'slack',
      status: 'active' as const,
      credentials: {
        bot_token: tokenData.access_token,
        team_id: tokenData.team?.id,
        team_name: tokenData.team?.name,
      },
      settings: {},
      connected_by: auth.userId || null,
      connected_at: new Date().toISOString(),
      error_message: null,
    };

    if (existing) {
      // Update existing integration
      const { error: updateError } = await supabaseAdmin
        .from('integrations')
        .update(integrationData)
        .eq('id', existing.id);

      if (updateError) {
        console.error('Failed to update integration:', updateError);
        return NextResponse.redirect(
          new URL('/settings/integrations?error=db_error', request.url)
        );
      }
    } else {
      // Insert new integration
      const { error: insertError } = await supabaseAdmin
        .from('integrations')
        .insert({
          id: uuidv4(),
          ...integrationData,
        });

      if (insertError) {
        console.error('Failed to insert integration:', insertError);
        return NextResponse.redirect(
          new URL('/settings/integrations?error=db_error', request.url)
        );
      }
    }

    // Clear the state cookie and redirect to success
    const response = NextResponse.redirect(
      new URL('/settings/integrations?connected=slack', request.url)
    );
    response.cookies.delete('slack_oauth_state');

    return response;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.redirect(
        new URL('/login?redirect=/settings/integrations', request.url)
      );
    }
    console.error('Slack OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=unknown', request.url)
    );
  }
}
