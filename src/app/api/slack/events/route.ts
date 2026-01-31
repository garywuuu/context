import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifySlackSignature } from '@/lib/slack';
import { processMessages } from '@/lib/extraction';
import { sendDecisionConfirmationDM } from '@/lib/slack/decision-dm';
import { parseGCLink, buildDecisionUnfurl } from '@/lib/slack/unfurl';
import { publishAppHome } from '@/lib/slack/app-home';
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
  void processEventAsync(event, teamId).catch((err) => {
    console.error('Error processing Slack event:', err);
  });

  return NextResponse.json({ ok: true });
}

/**
 * Route events to the appropriate handler.
 */
async function processEventAsync(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const eventType = event.type as string;

  switch (eventType) {
    case 'message':
      await handleMessageEvent(event, teamId);
      break;
    case 'link_shared':
      await handleLinkShared(event, teamId);
      break;
    case 'app_home_opened':
      await handleAppHomeOpened(event, teamId);
      break;
    default:
      // Ignore unhandled event types
      break;
  }
}

// ---------- Message event handler (existing logic + DM sending) ----------

async function handleMessageEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
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
  const botToken = (integration.credentials as Record<string, string>)?.bot_token;
  let userName: string | undefined;
  try {
    const { WebClient } = await import('@slack/web-api');
    if (botToken) {
      const client = new WebClient(botToken);
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

          // After extraction, check if a pending decision was created and send DM
          await maybeSendDecisionDM(organizationId, channelName, threadTs, userId, botToken, channelId);
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

    // After extraction, check if a pending decision was created and send DM
    await maybeSendDecisionDM(organizationId, channelName, undefined, userId, botToken, channelId, messageTs);
  }
}

/**
 * After processMessages runs, check if a new pending decision was created.
 * If so, DM the message author with confirmation buttons.
 */
async function maybeSendDecisionDM(
  organizationId: string,
  channelName: string,
  threadTs: string | undefined,
  slackUserId: string,
  botToken: string | undefined,
  channelId: string,
  messageTs?: string
): Promise<void> {
  if (!botToken) return;

  // Find the most recently created pending decision for this channel/thread
  let query = supabaseAdmin
    .from('extracted_decisions')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('source_channel', channelName)
    .eq('status', 'pending')
    .order('extracted_at', { ascending: false })
    .limit(1);

  if (threadTs) {
    query = query.eq('source_thread_ts', threadTs);
  }

  const { data: decisions } = await query;
  const decision = decisions?.[0];
  if (!decision) return;

  // Only DM for pending decisions (confidence 0.60-0.84 range — high-confidence ones
  // would have been auto-promoted if that logic existed, but currently all are "pending")
  if (decision.status !== 'pending') return;

  // Build source URL for "View in Slack"
  // Slack deep link format: https://slack.com/archives/{channel}/{message_ts}
  const sourceTs = threadTs || messageTs || '';
  const sourceUrl = sourceTs
    ? `https://slack.com/archives/${channelId}/p${sourceTs.replace('.', '')}`
    : undefined;

  const rawExtraction = (decision.raw_extraction as Record<string, unknown>) || {};

  const dmResult = await sendDecisionConfirmationDM({
    botToken,
    slackUserId,
    traceId: decision.id,
    title: decision.title,
    rationale: decision.rationale || '',
    area: (rawExtraction.area as string) || undefined,
    confidence: decision.confidence,
    sourceUrl,
    channelName,
  });

  if (dmResult.ok && dmResult.channelId && dmResult.messageTs) {
    // Store DM reference in raw_extraction for later message updates
    await supabaseAdmin
      .from('extracted_decisions')
      .update({
        raw_extraction: {
          ...rawExtraction,
          dm_channel_id: dmResult.channelId,
          dm_message_ts: dmResult.messageTs,
        },
      })
      .eq('id', decision.id);
  }
}

// ---------- Link shared handler ----------

async function handleLinkShared(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const links = event.links as Array<{ url: string; domain: string }> | undefined;
  if (!links || links.length === 0) return;

  const messageTs = event.message_ts as string;
  const channel = event.channel as string;

  // Look up integration
  const { data: integrations } = await supabaseAdmin
    .from('integrations')
    .select('organization_id, credentials')
    .eq('provider', 'slack')
    .eq('status', 'active');

  const integration = integrations?.find((i) => {
    const creds = i.credentials as Record<string, string> | undefined;
    return creds?.team_id === teamId;
  });

  if (!integration) return;

  const creds = integration.credentials as Record<string, string>;
  const botToken = creds.bot_token;
  if (!botToken) return;

  const { WebClient } = await import('@slack/web-api');
  const client = new WebClient(botToken);
  const organizationId = integration.organization_id;

  // Build unfurls map
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unfurls: Record<string, any> = {};

  for (const link of links) {
    const parsed = parseGCLink(link.url);
    if (!parsed) continue;

    if (parsed.type === 'decision') {
      const { data: decision } = await supabaseAdmin
        .from('extracted_decisions')
        .select('title, rationale, status, confidence, participants, source_channel, extracted_at')
        .eq('id', parsed.id)
        .eq('organization_id', organizationId)
        .single();

      if (decision) {
        unfurls[link.url] = buildDecisionUnfurl(decision);
      }
    }
  }

  if (Object.keys(unfurls).length > 0) {
    try {
      await client.chat.unfurl({
        channel,
        ts: messageTs,
        unfurls,
      });
    } catch (err) {
      // Silently fail if scope missing (links:write not granted)
      console.error('Failed to unfurl links:', err);
    }
  }
}

// ---------- App Home opened handler ----------

async function handleAppHomeOpened(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const slackUserId = event.user as string;
  if (!slackUserId) return;

  // Only rebuild on the "home" tab
  const tab = event.tab as string | undefined;
  if (tab && tab !== 'home') return;

  // Look up integration
  const { data: integrations } = await supabaseAdmin
    .from('integrations')
    .select('organization_id, credentials')
    .eq('provider', 'slack')
    .eq('status', 'active');

  const integration = integrations?.find((i) => {
    const creds = i.credentials as Record<string, string> | undefined;
    return creds?.team_id === teamId;
  });

  if (!integration) return;

  const creds = integration.credentials as Record<string, string>;
  const botToken = creds.bot_token;
  if (!botToken) return;

  try {
    await publishAppHome(botToken, slackUserId, integration.organization_id);
  } catch (err) {
    console.error('Failed to publish App Home:', err);
  }
}
