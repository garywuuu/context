/**
 * URL parsing and Block Kit unfurl builder for link_shared events.
 */
import type { SlackBlock } from './block-kit';
import { section, sectionFields, context, divider } from './block-kit';

// Domains to recognize as GC links
const GC_HOSTS = [
  'general-context.vercel.app',
  'www.general-context.vercel.app',
];

export interface ParsedGCLink {
  type: 'decision';
  id: string;
}

/**
 * Parse a URL and return the resource type + ID if it's a known GC link.
 * Matches: https://general-context.vercel.app/vault/{id}
 */
export function parseGCLink(url: string): ParsedGCLink | null {
  try {
    const parsed = new URL(url);
    if (!GC_HOSTS.includes(parsed.hostname)) return null;

    // Match /vault/{uuid}
    const vaultMatch = parsed.pathname.match(/^\/vault\/([a-f0-9-]+)$/i);
    if (vaultMatch) {
      return { type: 'decision', id: vaultMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Build a Block Kit attachment for a decision unfurl.
 */
export function buildDecisionUnfurl(decision: {
  title: string;
  rationale?: string;
  status?: string;
  confidence?: number;
  participants?: string[];
  source_channel?: string;
  extracted_at?: string;
}): { blocks: SlackBlock[] } {
  const blocks: SlackBlock[] = [
    section(`*${decision.title}*`),
  ];

  if (decision.rationale) {
    blocks.push(section(decision.rationale));
  }

  const fields: string[] = [];
  if (decision.status) fields.push(`*Status:* ${decision.status}`);
  if (decision.confidence != null)
    fields.push(`*Confidence:* ${Math.round(decision.confidence * 100)}%`);
  if (decision.source_channel)
    fields.push(`*Source:* #${decision.source_channel}`);
  if (decision.participants?.length)
    fields.push(`*Participants:* ${decision.participants.join(', ')}`);

  if (fields.length > 0) {
    blocks.push(sectionFields(fields));
  }

  blocks.push(divider());

  const contextParts: string[] = [];
  if (decision.extracted_at) {
    const date = new Date(decision.extracted_at);
    contextParts.push(`Extracted ${date.toLocaleDateString()}`);
  }
  contextParts.push('Powered by General Context');
  blocks.push(context(contextParts));

  return { blocks };
}
