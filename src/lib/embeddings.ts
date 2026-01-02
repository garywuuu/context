import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for a piece of text using OpenAI
 * Uses text-embedding-3-small (1536 dimensions, cheap, reliable)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

/**
 * Create a searchable text representation of a decision
 * This is what gets embedded for semantic search
 */
export function createDecisionText(decision: {
  action_taken: string;
  context_snapshot: Record<string, unknown>;
  policies_evaluated?: Array<{ policy_name: string; passed: boolean; details?: string }>;
  outcome?: string;
}): string {
  const parts: string[] = [];

  // Action taken
  parts.push(`Action: ${decision.action_taken}`);

  // Context summary
  if (decision.context_snapshot) {
    const contextStr = JSON.stringify(decision.context_snapshot);
    // Truncate if too long
    parts.push(`Context: ${contextStr.slice(0, 500)}`);
  }

  // Policies evaluated
  if (decision.policies_evaluated?.length) {
    const policyStr = decision.policies_evaluated
      .map((p) => `${p.policy_name}: ${p.passed ? 'passed' : 'failed'}`)
      .join(', ');
    parts.push(`Policies: ${policyStr}`);
  }

  // Outcome if known
  if (decision.outcome) {
    parts.push(`Outcome: ${decision.outcome}`);
  }

  return parts.join('\n');
}

/**
 * Extract a policy from a human override explanation using LLM
 * This is the "tacit knowledge extraction" piece
 */
export async function extractPolicyFromOverride(
  originalAction: string,
  correction: string,
  humanExplanation: string
): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a policy extraction assistant. Given a human's correction of an agent decision and their explanation, extract a generalizable policy rule that could prevent similar mistakes in the future.

Output a concise policy statement (1-2 sentences) that captures the rule. If no clear policy can be extracted, respond with "NO_POLICY".`,
        },
        {
          role: 'user',
          content: `Original agent action: ${originalAction}
Human correction: ${correction}
Human explanation: ${humanExplanation}

Extract a policy rule from this override:`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const policy = response.choices[0]?.message?.content?.trim();

    if (!policy || policy === 'NO_POLICY') {
      return null;
    }

    return policy;
  } catch (error) {
    console.error('Error extracting policy:', error);
    return null;
  }
}
