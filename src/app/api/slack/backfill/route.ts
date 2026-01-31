import { NextRequest, NextResponse } from 'next/server';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getSlackClient } from '@/lib/slack';
import { processMessages } from '@/lib/extraction';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/slack/backfill - Trigger historical message ingestion + extraction
 * Body: { months: number }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body = await request.json();
    const months = body.months as number;

    if (!months || months < 1 || months > 12) {
      return NextResponse.json(
        { error: 'months must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Get the active Slack integration
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('id')
      .eq('organization_id', auth.organizationId)
      .eq('provider', 'slack')
      .eq('status', 'active')
      .single();

    if (!integration) {
      return NextResponse.json(
        { error: 'No active Slack integration found' },
        { status: 404 }
      );
    }

    // Get active monitored channels
    const { data: channels } = await supabaseAdmin
      .from('slack_channels')
      .select('*')
      .eq('organization_id', auth.organizationId)
      .eq('is_active', true);

    if (!channels || channels.length === 0) {
      return NextResponse.json(
        { error: 'No monitored channels configured. Select channels first.' },
        { status: 400 }
      );
    }

    // Fire-and-forget the actual backfill work
    void runBackfill(
      auth.organizationId,
      integration.id,
      channels,
      months
    ).catch((err) => {
      console.error('Backfill error:', err);
    });

    return NextResponse.json({
      status: 'started',
      channels: channels.length,
      months,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error starting backfill:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

interface ChannelRecord {
  id: string;
  channel_id: string;
  channel_name: string;
}

async function runBackfill(
  organizationId: string,
  integrationId: string,
  channels: ChannelRecord[],
  months: number
): Promise<void> {
  const client = await getSlackClient(organizationId);
  const oldest = String(
    Math.floor(Date.now() / 1000) - months * 30 * 24 * 60 * 60
  );

  for (const channel of channels) {
    try {
      await backfillChannel(
        client,
        organizationId,
        integrationId,
        channel,
        oldest
      );

      // Update last_synced_at
      await supabaseAdmin
        .from('slack_channels')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', channel.id);
    } catch (err) {
      console.error(`Backfill failed for channel ${channel.channel_name}:`, err);
    }
  }
}

async function backfillChannel(
  client: Awaited<ReturnType<typeof getSlackClient>>,
  organizationId: string,
  integrationId: string,
  channel: ChannelRecord,
  oldest: string
): Promise<void> {
  let cursor: string | undefined;
  let totalMessages = 0;

  // Build a cache for user names to avoid repeated API calls
  const userNameCache = new Map<string, string>();

  async function resolveUserName(userId: string): Promise<string> {
    if (userNameCache.has(userId)) return userNameCache.get(userId)!;
    try {
      const info = await client.users.info({ user: userId });
      const name =
        info.user?.real_name ||
        info.user?.profile?.display_name ||
        info.user?.name ||
        userId;
      userNameCache.set(userId, name);
      return name;
    } catch {
      userNameCache.set(userId, userId);
      return userId;
    }
  }

  do {
    // Fetch message history page
    const result = await client.conversations.history({
      channel: channel.channel_id,
      oldest,
      limit: 200,
      cursor,
    });

    const messages = result.messages || [];

    for (const msg of messages) {
      // Skip bot messages and subtypes
      if ((msg as Record<string, unknown>).subtype) continue;

      const userName = msg.user ? await resolveUserName(msg.user) : undefined;

      // Check if message already exists
      const { data: existing } = await supabaseAdmin
        .from('slack_messages')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('channel_id', channel.channel_id)
        .eq('message_ts', msg.ts!)
        .single();

      if (!existing) {
        await supabaseAdmin.from('slack_messages').insert({
          id: uuidv4(),
          organization_id: organizationId,
          integration_id: integrationId,
          channel_id: channel.channel_id,
          message_ts: msg.ts!,
          thread_ts: msg.thread_ts || null,
          user_id: msg.user || null,
          user_name: userName || null,
          content: msg.text || '',
          raw_payload: msg as Record<string, unknown>,
          ingested_at: new Date().toISOString(),
        });
        totalMessages++;
      }

      // If the message is a thread parent with 3+ replies, fetch full thread
      if (msg.reply_count && msg.reply_count >= 2) {
        const threadTs = msg.ts!;

        // Check if we already extracted a decision for this thread
        const { data: existingExtraction } = await supabaseAdmin
          .from('extracted_decisions')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('source_thread_ts', threadTs)
          .eq('source_channel', channel.channel_name)
          .single();

        if (!existingExtraction) {
          // Fetch thread replies
          let threadCursor: string | undefined;
          const threadMessages: Array<{
            message_ts: string;
            user_name?: string;
            content: string;
            thread_ts?: string;
          }> = [];

          do {
            const threadResult = await client.conversations.replies({
              channel: channel.channel_id,
              ts: threadTs,
              limit: 200,
              cursor: threadCursor,
            });

            for (const reply of threadResult.messages || []) {
              if ((reply as Record<string, unknown>).subtype) continue;

              const replyUserName = reply.user
                ? await resolveUserName(reply.user)
                : undefined;

              // Insert reply message if not already stored
              const { data: existingReply } = await supabaseAdmin
                .from('slack_messages')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('channel_id', channel.channel_id)
                .eq('message_ts', reply.ts!)
                .single();

              if (!existingReply) {
                await supabaseAdmin.from('slack_messages').insert({
                  id: uuidv4(),
                  organization_id: organizationId,
                  integration_id: integrationId,
                  channel_id: channel.channel_id,
                  message_ts: reply.ts!,
                  thread_ts: reply.thread_ts || threadTs,
                  user_id: reply.user || null,
                  user_name: replyUserName || null,
                  content: reply.text || '',
                  raw_payload: reply as Record<string, unknown>,
                  ingested_at: new Date().toISOString(),
                });
                totalMessages++;
              }

              threadMessages.push({
                message_ts: reply.ts!,
                user_name: replyUserName,
                content: reply.text || '',
                thread_ts: reply.thread_ts || threadTs,
              });
            }

            threadCursor =
              threadResult.response_metadata?.next_cursor || undefined;
          } while (threadCursor);

          // Run extraction on threads with 3+ messages
          if (threadMessages.length >= 3) {
            try {
              await processMessages(
                organizationId,
                threadMessages,
                channel.channel_name,
                threadTs
              );
            } catch (err) {
              console.error(
                `Extraction failed for thread ${threadTs} in ${channel.channel_name}:`,
                err
              );
            }
          }
        }
      }
    }

    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  console.log(
    `Backfill complete for #${channel.channel_name}: ${totalMessages} new messages`
  );
}
