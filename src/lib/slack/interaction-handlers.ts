/**
 * Handlers for Slack interactive payloads (button clicks, modal submissions).
 */
import { WebClient } from '@slack/web-api';
import { supabaseAdmin } from '@/lib/supabase';
import type { SlackBlock } from './block-kit';
import {
  buildDecisionConfirmedBlocks,
  buildDecisionEditModal,
} from './decision-blocks';

// ---------- Helpers ----------

async function getBotTokenForTeam(
  teamId: string
): Promise<{ botToken: string; organizationId: string } | null> {
  const { data: integrations } = await supabaseAdmin
    .from('integrations')
    .select('organization_id, credentials')
    .eq('provider', 'slack')
    .eq('status', 'active');

  const integration = integrations?.find((i) => {
    const creds = i.credentials as Record<string, string> | undefined;
    return creds?.team_id === teamId;
  });

  if (!integration) return null;
  const creds = integration.credentials as Record<string, string>;
  return { botToken: creds.bot_token, organizationId: integration.organization_id };
}

async function updateSlackMessage(
  botToken: string,
  channelId: string,
  ts: string,
  blocks: SlackBlock[],
  text: string
): Promise<void> {
  const client = new WebClient(botToken);
  await client.chat.update({ channel: channelId, ts, blocks, text });
}

async function openSlackModal(
  botToken: string,
  triggerId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  view: any
): Promise<void> {
  const client = new WebClient(botToken);
  await client.views.open({ trigger_id: triggerId, view });
}

// ---------- Block action handlers ----------

export async function handleBlockAction(payload: Record<string, unknown>): Promise<void> {
  const actionList = payload.actions as Array<Record<string, unknown>> | undefined;
  if (!actionList || actionList.length === 0) return;

  const action = actionList[0];
  const actionId = action.action_id as string;
  const traceId = action.value as string;

  const team = (payload.team as Record<string, string>) || {};
  const teamId = team.id;
  const auth = await getBotTokenForTeam(teamId);
  if (!auth) {
    console.error('No bot token found for team:', teamId);
    return;
  }

  const user = (payload.user as Record<string, string>) || {};
  const userName = user.username || user.name || 'someone';

  // Fetch the trace to get title + DM reference
  const { data: trace } = await supabaseAdmin
    .from('extracted_decisions')
    .select('*')
    .eq('id', traceId)
    .single();

  if (!trace) {
    console.error('Trace not found:', traceId);
    return;
  }

  const rawExtraction = trace.raw_extraction as Record<string, unknown> | null;
  const dmChannelId = (rawExtraction?.dm_channel_id as string) || '';
  const dmMessageTs = (rawExtraction?.dm_message_ts as string) || '';

  switch (actionId) {
    case 'decision_confirm': {
      // Promote trace to confirmed
      await supabaseAdmin
        .from('extracted_decisions')
        .update({
          status: 'confirmed',
          reviewed_by: userName,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', traceId);

      // Update the DM to show confirmed state
      if (dmChannelId && dmMessageTs) {
        const blocks = buildDecisionConfirmedBlocks(trace.title, 'confirmed', userName);
        await updateSlackMessage(auth.botToken, dmChannelId, dmMessageTs, blocks, `Confirmed: ${trace.title}`);
      }
      break;
    }

    case 'decision_edit': {
      // Open modal — must happen fast (trigger_id expires in ~3s)
      const triggerId = payload.trigger_id as string;
      if (!triggerId) {
        console.error('No trigger_id for edit action');
        return;
      }

      const modal = buildDecisionEditModal({
        traceId,
        title: trace.title || '',
        rationale: trace.rationale || '',
        area: (rawExtraction?.area as string) || undefined,
        type: (rawExtraction?.type as string) || undefined,
      });

      await openSlackModal(auth.botToken, triggerId, modal);
      break;
    }

    case 'decision_ignore': {
      // Mark trace as dismissed
      await supabaseAdmin
        .from('extracted_decisions')
        .update({
          status: 'dismissed',
          reviewed_by: userName,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', traceId);

      // Update the DM
      if (dmChannelId && dmMessageTs) {
        const blocks = buildDecisionConfirmedBlocks(trace.title, 'dismissed', userName);
        await updateSlackMessage(auth.botToken, dmChannelId, dmMessageTs, blocks, `Dismissed: ${trace.title}`);
      }
      break;
    }

    default:
      console.warn('Unknown action_id:', actionId);
  }
}

// ---------- View submission handler ----------

export async function handleViewSubmission(
  payload: Record<string, unknown>
): Promise<{ response_action?: string; errors?: Record<string, string> } | null> {
  const view = payload.view as Record<string, unknown> | undefined;
  if (!view) return null;

  const callbackId = view.callback_id as string;
  if (callbackId !== 'decision_edit_modal') return null;

  const traceId = view.private_metadata as string;

  // Extract form values
  const stateValues = (
    (view.state as Record<string, unknown>)?.values as Record<
      string,
      Record<string, Record<string, unknown>>
    >
  ) || {};

  const title =
    (stateValues.title_block?.title_input?.value as string) || '';
  const rationale =
    (stateValues.rationale_block?.rationale_input?.value as string) || '';
  const areaSelected = stateValues.area_block?.area_input?.selected_option as
    | Record<string, string>
    | undefined;
  const typeSelected = stateValues.type_block?.type_input?.selected_option as
    | Record<string, string>
    | undefined;

  if (!title.trim()) {
    return {
      response_action: 'errors',
      errors: { title_block: 'Title is required' },
    };
  }

  const area = areaSelected?.value || null;
  const type = typeSelected?.value || null;

  const team = (payload.team as Record<string, string>) || {};
  const teamId = team?.id;
  const auth = await getBotTokenForTeam(teamId);

  const user = (payload.user as Record<string, string>) || {};
  const userName = user.username || user.name || 'someone';

  // Update the trace
  const { data: trace } = await supabaseAdmin
    .from('extracted_decisions')
    .select('*')
    .eq('id', traceId)
    .single();

  if (!trace) return null;

  const existingRaw = (trace.raw_extraction as Record<string, unknown>) || {};

  await supabaseAdmin
    .from('extracted_decisions')
    .update({
      title,
      rationale,
      raw_extraction: { ...existingRaw, area, type },
      status: 'edited',
      reviewed_by: userName,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', traceId);

  // Update the DM to show edited state
  if (auth) {
    const dmChannelId = (existingRaw.dm_channel_id as string) || '';
    const dmMessageTs = (existingRaw.dm_message_ts as string) || '';
    if (dmChannelId && dmMessageTs) {
      const blocks = buildDecisionConfirmedBlocks(title, 'edited', userName);
      await updateSlackMessage(
        auth.botToken,
        dmChannelId,
        dmMessageTs,
        blocks,
        `Edited & confirmed: ${title}`
      );
    }
  }

  return null; // close modal
}
