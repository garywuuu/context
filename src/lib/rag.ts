import { generateEmbedding } from '@/lib/embeddings';
import { getOrgLLMConfig, chatCompletion } from '@/lib/llm';
import { supabaseAdmin } from '@/lib/supabase';

export interface AskResult {
  answer: string;
  sources: {
    decision_id: string;
    action_taken: string;
    reasoning?: string;
    participants?: string[];
    timestamp: string;
    similarity: number;
    source_url?: string;
  }[];
}

export async function askQuestion(
  organizationId: string,
  question: string,
  options?: { limit?: number; threshold?: number }
): Promise<AskResult> {
  const limit = options?.limit || 5;
  const threshold = options?.threshold || 0.5;

  // 1. Generate embedding for the question
  const queryEmbedding = await generateEmbedding(question);

  // 2. Vector search via RPC
  const { data: results, error } = await supabaseAdmin.rpc('match_decisions', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error || !results || results.length === 0) {
    return {
      answer: "I don't have enough context to answer this question. No related decisions were found.",
      sources: [],
    };
  }

  // 3. Build context from matched decisions
  const contextText = results.map((d: any, i: number) => {
    const participants = d.context_snapshot?.participants;
    const participantLine = participants?.length
      ? `\n     People involved: ${participants.join(', ')}`
      : '';
    return `Decision ${i + 1}: "${d.action_taken}"
     Date: ${d.timestamp}${participantLine}
     Rationale: ${d.reasoning || 'Not recorded'}
     Outcome: ${d.outcome || 'Not recorded'}
     Confidence: ${Math.round(d.confidence * 100)}%`;
  }).join('\n\n');

  // 4. Generate answer using org's LLM config
  const llmConfig = await getOrgLLMConfig(organizationId);
  const response = await chatCompletion(llmConfig, [
    {
      role: 'system',
      content: `You are a decision knowledge assistant. Answer questions based ONLY on the decisions provided below. Always cite which decision(s) your answer is based on. If the decisions don't contain enough information to fully answer the question, say so.

Be concise (2-5 sentences). Include specific dates, people, and rationale when available.

Decisions from the organization's history:
${contextText}`
    },
    { role: 'user', content: question }
  ], { model: 'smart' });

  return {
    answer: response.content,
    sources: results.map((d: any) => ({
      decision_id: d.id,
      action_taken: d.action_taken,
      reasoning: d.reasoning,
      participants: d.context_snapshot?.participants || [],
      timestamp: d.timestamp,
      similarity: d.similarity,
      source_url: d.context_snapshot?.source_url,
    })),
  };
}
