import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySlackSignature } from '@/lib/slack';
import { processMessages } from '@/lib/extraction';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/slack/events - Slack Events API webhook
 * PUBLIC endpoint - no session auth. Verified via Slack signing secret.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: Record<string, unknown>;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Handle URL verification challenge (Slack sends this during app setup)
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Verify Slack signature
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error('SLACK_SIGNING_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const signature = request.headers.get('x-slack-signature') || '';
  const timestamp = request.headers.get('x-slack-request-timestamp') || '';

  if (!verifySlackSignature(signingSecret, signature, timestamp, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Return 200 immediately - process asynchronously
  // Slack expects a response within 3 seconds
  const event = body.event as Record<string, unknown> | undefined;
  const teamId = body.team_id as string | undefined;

  if (!event || !teamId) {
    return NextResponse.json({ ok: true });
  }

  // Fire-and-forget: process the event asynchronously
  void handleEvent(event, teamId).catch((err) => {
    console.error('Error processing Slack event:', err);
  });

  return NextResponse.json({ ok: true });
}

async function handleEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  // Only handle message events
  if (event.type !== 'message') return;

  // Skip bot messages, message_changed, message_deleted, etc.
  if (event.subtype) return;

  // Look up the organization by team_id in the integration credentials
  const { data: integrations } = await supabaseAdmin
    .from('integrations')
    .select('id, organization_id, credentials')
    .eq('provider', 'slack')
    .eq('status', 'active');

  const integration = integrations?.find((i) => {
    const creds = i.credentials as Record<string, string> | undefined;
    return creds?.team_id === teamId;
  }) as { id: string; organization_id: string; credentials?: Record<string, string> } | undefined;

  if (!integration) {
    console.error('No integration found for team:', teamId);
    return;
  }

  const organizationId = integration.organization_id;
  const integrationId = integration.id;
  const channelId = event.channel as string;
  const messageTs = event.ts as string;
  const threadTs = event.thread_ts as string | undefined;
  const userId = event.user as string;
  const text = event.text as string;

  // Check if this channel is being monitored
  const { data: slackChannel } = await supabaseAdmin
    .from('slack_channels')
    .select('id, channel_name')
    .eq('organization_id', organizationId)
    .eq('channel_id', channelId)
    .eq('is_active', true)
    .single();

  if (!slackChannel) return; // Channel not monitored

  // Resolve user name
  let userName: string | undefined;
  try {
    const { WebClient } = await import('@slack/web-api');
    const creds = (
      await supabaseAdmin
        .from('integrations')
        .select('credentials')
        .eq('id', integrationId)
        .single()
    ).data?.credentials as Record<string, string>;

    if (creds?.bot_token) {
      const client = new WebClient(creds.bot_token);
      const userInfo = await client.users.info({ user: userId });
      userName =
        userInfo.user?.real_name ||
        userInfo.user?.profile?.display_name ||
        userInfo.user?.name ||
        userId;
    }
  } catch {
    userName = userId;
  }

  // Insert the message into slack_messages
  const { error: insertError } = await supabaseAdmin
    .from('slack_messages')
    .insert({
      id: uuidv4(),
      organization_id: organizationId,
      integration_id: integrationId,
      channel_id: channelId,
      message_ts: messageTs,
      thread_ts: threadTs || null,
      user_id: userId,
      user_name: userName,
      content: text || '',
      raw_payload: event,
      ingested_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error('Failed to insert Slack message:', insertError);
    return;
  }

  const channelName = slackChannel.channel_name;

  // Determine if we should run extraction
  if (threadTs) {
    // This is a threaded reply - check how many messages are in this thread
    const { count } = await supabaseAdmin
      .from('slack_messages')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('channel_id', channelId)
      .or(`thread_ts.eq.${threadTs},message_ts.eq.${threadTs}`);

    if (count && count >= 3) {
      // Fetch all thread messages for extraction
      const { data: threadMessages } = await supabaseAdmin
        .from('slack_messages')
        .select('message_ts, user_name, content, thread_ts')
        .eq('organization_id', organizationId)
        .eq('channel_id', channelId)
        .or(`thread_ts.eq.${threadTs},message_ts.eq.${threadTs}`)
        .order('message_ts', { ascending: true });

      if (threadMessages && threadMessages.length >= 3) {
        // Check if we already extracted a decision for this thread
        const { data: existingExtraction } = await supabaseAdmin
          .from('extracted_decisions')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('source_thread_ts', threadTs)
          .eq('source_channel', channelName)
          .single();

        if (!existingExtraction) {
          await processMessages(
            organizationId,
            threadMessages.map((m) => ({
              message_ts: m.message_ts,
              user_name: m.user_name || undefined,
              content: m.content,
              thread_ts: m.thread_ts || undefined,
            })),
            channelName,
            threadTs
          );
        }
      }
    }
  } else {
    // Standalone message - classify individually
    await processMessages(
      organizationId,
      [
        {
          message_ts: messageTs,
          user_name: userName,
          content: text || '',
        },
      ],
      channelName
    );
  }
}
