import { WebClient } from '@slack/web-api';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function getSlackClient(organizationId: string): Promise<WebClient> {
  const { data } = await supabaseAdmin
    .from('integrations')
    .select('credentials')
    .eq('organization_id', organizationId)
    .eq('provider', 'slack')
    .eq('status', 'active')
    .single();

  if (!data) throw new Error('No active Slack integration found');
  const creds = data.credentials as Record<string, string>;
  return new WebClient(creds.bot_token);
}

export function verifySlackSignature(
  signingSecret: string,
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

export function getSlackOAuthURL(state: string): string {
  const scopes = [
    'channels:history',
    'channels:read',
    'groups:read',
    'groups:history',
    'users:read',
    'chat:write',
    'commands',
    'im:write',
    'links:read',
    'links:write',
  ];
  return `https://slack.com/oauth/v2/authorize?client_id=${process.env.SLACK_CLIENT_ID}&scope=${scopes.join(',')}&state=${state}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/slack/oauth/callback`;
}
