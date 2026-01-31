/**
 * Send a decision-confirmation DM to the message author.
 */
import { WebClient } from '@slack/web-api';
import {
  buildDecisionConfirmationBlocks,
  type DecisionConfirmationParams,
} from './decision-blocks';

export interface SendDMResult {
  ok: boolean;
  channelId?: string;
  messageTs?: string;
}

export async function sendDecisionConfirmationDM(params: {
  botToken: string;
  slackUserId: string;
  traceId: string;
  title: string;
  rationale: string;
  area?: string;
  confidence: number;
  sourceUrl?: string;
  channelName?: string;
}): Promise<SendDMResult> {
  const { botToken, slackUserId, ...blockParams } = params;
  const client = new WebClient(botToken);

  try {
    // Open (or re-open) a DM channel with the user
    const convo = await client.conversations.open({ users: slackUserId });
    const channelId = convo.channel?.id;
    if (!channelId) return { ok: false };

    const blocks = buildDecisionConfirmationBlocks(
      blockParams as DecisionConfirmationParams
    );

    const msg = await client.chat.postMessage({
      channel: channelId,
      text: `Decision detected: ${params.title}`, // fallback for notifications
      blocks,
    });

    return {
      ok: !!msg.ok,
      channelId,
      messageTs: msg.ts,
    };
  } catch (err) {
    console.error('Failed to send decision confirmation DM:', err);
    return { ok: false };
  }
}
