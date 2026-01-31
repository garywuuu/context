import { NextRequest, NextResponse } from 'next/server';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getSlackClient } from '@/lib/slack';
import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/slack/channels - List available Slack channels
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const client = await getSlackClient(auth.organizationId);

    // Fetch all public channels (and private channels the bot is in)
    const channels: Array<{
      id: string;
      name: string;
      num_members: number;
      is_private: boolean;
      is_member: boolean;
    }> = [];

    let cursor: string | undefined;
    do {
      const result = await client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 200,
        cursor,
      });

      if (result.channels) {
        for (const ch of result.channels) {
          channels.push({
            id: ch.id!,
            name: ch.name || ch.id!,
            num_members: ch.num_members || 0,
            is_private: ch.is_private || false,
            is_member: ch.is_member || false,
          });
        }
      }

      cursor = result.response_metadata?.next_cursor || undefined;
    } while (cursor);

    // Also fetch currently monitored channels from the database
    const { data: monitoredChannels } = await supabaseAdmin
      .from('slack_channels')
      .select('channel_id, is_active')
      .eq('organization_id', auth.organizationId);

    const monitoredSet = new Set(
      (monitoredChannels || [])
        .filter((c) => c.is_active)
        .map((c) => c.channel_id)
    );

    // Merge monitored status into channel list
    const enrichedChannels = channels.map((ch) => ({
      ...ch,
      is_monitored: monitoredSet.has(ch.id),
    }));

    return NextResponse.json({ channels: enrichedChannels });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching Slack channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/slack/channels - Save monitored channel selections
 * Body: { channel_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body = await request.json();
    const { channel_ids } = body as { channel_ids: string[] };

    if (!Array.isArray(channel_ids)) {
      return NextResponse.json(
        { error: 'channel_ids must be an array of strings' },
        { status: 400 }
      );
    }

    // Look up the active Slack integration
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

    // Get Slack client to look up channel names
    const client = await getSlackClient(auth.organizationId);

    // Deactivate all channels currently monitored for this org
    await supabaseAdmin
      .from('slack_channels')
      .update({ is_active: false })
      .eq('organization_id', auth.organizationId);

    // Upsert the selected channels
    for (const channelId of channel_ids) {
      // Fetch channel info for name
      let channelName = channelId;
      try {
        const info = await client.conversations.info({ channel: channelId });
        channelName = info.channel?.name || channelId;
      } catch {
        // If we can't get info, use the ID as the name
      }

      // Check if channel record already exists
      const { data: existingChannel } = await supabaseAdmin
        .from('slack_channels')
        .select('id')
        .eq('organization_id', auth.organizationId)
        .eq('channel_id', channelId)
        .single();

      if (existingChannel) {
        await supabaseAdmin
          .from('slack_channels')
          .update({
            is_active: true,
            channel_name: channelName,
          })
          .eq('id', existingChannel.id);
      } else {
        await supabaseAdmin
          .from('slack_channels')
          .insert({
            id: uuidv4(),
            integration_id: integration.id,
            organization_id: auth.organizationId,
            channel_id: channelId,
            channel_name: channelName,
            is_active: true,
          });
      }
    }

    return NextResponse.json({
      success: true,
      active_channels: channel_ids.length,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error saving Slack channels:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
