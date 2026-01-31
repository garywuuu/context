/**
 * App Home tab builder — publishes a mini dashboard when users open the bot profile.
 */
import { WebClient } from '@slack/web-api';
import { supabaseAdmin } from '@/lib/supabase';
import type { SlackBlock } from './block-kit';
import {
  header,
  section,
  sectionFields,
  divider,
  context,
  actions,
  button,
  plainText,
} from './block-kit';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://general-context.vercel.app';

export async function publishAppHome(
  botToken: string,
  slackUserId: string,
  organizationId: string
): Promise<void> {
  const client = new WebClient(botToken);

  // Fetch pending count
  const { count: pendingCount } = await supabaseAdmin
    .from('extracted_decisions')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending');

  // Fetch recent decisions (any status)
  const { data: recentDecisions } = await supabaseAdmin
    .from('extracted_decisions')
    .select('id, title, status, confidence, source_channel, extracted_at')
    .eq('organization_id', organizationId)
    .order('extracted_at', { ascending: false })
    .limit(5);

  // Build blocks
  const blocks: SlackBlock[] = [
    header('General Context'),
    section('Your team\'s decision memory. Decisions detected from monitored Slack channels appear here.'),
    divider(),
  ];

  // Pending callout
  if (pendingCount && pendingCount > 0) {
    blocks.push(
      section(`*${pendingCount} pending decision${pendingCount === 1 ? '' : 's'}* awaiting review. Check your DMs or the dashboard to confirm them.`)
    );
    blocks.push(divider());
  }

  // Recent decisions
  if (recentDecisions && recentDecisions.length > 0) {
    blocks.push(header('Recent Decisions'));

    for (const d of recentDecisions) {
      const statusEmoji =
        d.status === 'confirmed'
          ? '\u2705'
          : d.status === 'edited'
            ? '\u270F\uFE0F'
            : d.status === 'dismissed'
              ? '\u274C'
              : '\u23F3';

      const date = d.extracted_at
        ? new Date(d.extracted_at).toLocaleDateString()
        : '';

      const fields: string[] = [
        `${statusEmoji} *${d.title}*`,
      ];
      if (d.source_channel) fields.push(`#${d.source_channel}`);
      if (date) fields.push(date);

      blocks.push(sectionFields(fields));
    }
  } else {
    blocks.push(
      section('No decisions detected yet. Start by monitoring a channel in your dashboard.')
    );
  }

  blocks.push(divider());
  blocks.push(
    actions([
      button('Open Dashboard', 'open_dashboard', APP_URL, 'primary'),
    ])
  );

  await client.views.publish({
    user_id: slackUserId,
    view: {
      type: 'home',
      blocks,
      // Need to cast since Slack SDK types are strict
    } as Parameters<typeof client.views.publish>[0]['view'],
  });
}
