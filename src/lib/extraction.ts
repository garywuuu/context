import { supabaseAdmin } from '@/lib/supabase';
import { getOrgLLMConfig, chatCompletion } from '@/lib/llm';
import type { LLMConfig } from '@/types/v1';
import { v4 as uuidv4 } from 'uuid';

interface ClassificationResult {
  is_decision: boolean;
  confidence: number;
}

interface ExtractionResult {
  title: string;
  rationale: string;
  participants: string[];
  alternatives: { option: string; reason_rejected: string }[];
}

interface MessageInput {
  message_ts: string;
  user_name?: string;
  content: string;
  thread_ts?: string;
}

const CLASSIFICATION_SYSTEM_PROMPT = `You analyze Slack messages to detect decisions. A decision is when a team makes a choice, commits to an approach, or resolves an open question. NOT decisions: questions, status updates, casual chat, sharing links without conclusions. Respond with JSON: { "is_decision": boolean, "confidence": number (0-1) }`;

const EXTRACTION_SYSTEM_PROMPT = `Extract the decision from this Slack conversation. Return JSON: { "title": "short summary of what was decided (imperative, <15 words)", "rationale": "why this was decided (1-3 sentences)", "participants": ["names or Slack handles involved"], "alternatives": [{"option": "what else was considered", "reason_rejected": "why not chosen"}] }`;

/**
 * Step 1: Classify whether a message or thread contains a decision
 */
export async function classifyDecision(
  config: LLMConfig,
  text: string
): Promise<ClassificationResult> {
  const response = await chatCompletion(
    config,
    [
      { role: 'system', content: CLASSIFICATION_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    { model: 'fast', json: true }
  );

  try {
    const parsed = JSON.parse(response.content);
    return {
      is_decision: Boolean(parsed.is_decision),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    };
  } catch {
    console.error('Failed to parse classification response:', response.content);
    return { is_decision: false, confidence: 0 };
  }
}

/**
 * Step 2: Extract structured decision data from a message or thread
 */
export async function extractDecision(
  config: LLMConfig,
  text: string
): Promise<ExtractionResult> {
  const response = await chatCompletion(
    config,
    [
      { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    { model: 'fast', json: true }
  );

  try {
    const parsed = JSON.parse(response.content);
    return {
      title: parsed.title || 'Untitled decision',
      rationale: parsed.rationale || '',
      participants: Array.isArray(parsed.participants) ? parsed.participants : [],
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
    };
  } catch {
    console.error('Failed to parse extraction response:', response.content);
    return {
      title: 'Untitled decision',
      rationale: '',
      participants: [],
      alternatives: [],
    };
  }
}

/**
 * Format thread messages into a single text block for LLM analysis
 */
function formatThreadText(messages: MessageInput[]): string {
  return messages
    .map((m) => `${m.user_name || 'Unknown'}: ${m.content}`)
    .join('\n');
}

/**
 * Full pipeline: classify messages, extract if positive, write to extracted_decisions
 */
export async function processMessages(
  organizationId: string,
  messages: MessageInput[],
  channelName: string,
  threadTs?: string
): Promise<void> {
  if (messages.length === 0) return;

  const config = await getOrgLLMConfig(organizationId);
  const text = formatThreadText(messages);

  // Step 1: Classify
  const classification = await classifyDecision(config, text);

  if (!classification.is_decision || classification.confidence <= 0.6) {
    return;
  }

  // Step 2: Extract
  const extraction = await extractDecision(config, text);

  // Gather source message IDs
  const sourceMessageIds = messages.map((m) => m.message_ts);

  // Determine the source timestamp (earliest message in thread)
  const sourceTimestamp = messages.reduce((earliest, m) => {
    return m.message_ts < earliest ? m.message_ts : earliest;
  }, messages[0].message_ts);

  // Look up the integration to get integration_id for reference
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('provider', 'slack')
    .eq('status', 'active')
    .single();

  // Insert into extracted_decisions
  const { error } = await supabaseAdmin
    .from('extracted_decisions')
    .insert({
      id: uuidv4(),
      organization_id: organizationId,
      source_type: 'slack',
      source_channel: channelName,
      source_thread_ts: threadTs || null,
      source_message_ids: sourceMessageIds,
      title: extraction.title,
      rationale: extraction.rationale,
      participants: extraction.participants,
      alternatives: extraction.alternatives,
      confidence: classification.confidence,
      raw_extraction: {
        classification,
        extraction,
        integration_id: integration?.id || null,
        message_count: messages.length,
      },
      status: 'pending',
      extracted_at: new Date().toISOString(),
      source_timestamp: sourceTimestamp
        ? new Date(parseFloat(sourceTimestamp) * 1000).toISOString()
        : new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to insert extracted decision:', error);
    throw error;
  }
}
