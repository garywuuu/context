import OpenAI from 'openai';
import type { LLMProvider, LLMConfig } from '@/types/v1';
import { supabaseAdmin } from '@/lib/supabase';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export async function getOrgLLMConfig(organizationId: string): Promise<LLMConfig> {
  const { data } = await supabaseAdmin
    .from('organizations')
    .select('llm_provider, llm_config')
    .eq('id', organizationId)
    .single();

  const provider = (data?.llm_provider || 'openai') as LLMProvider;
  const config = (data?.llm_config || {}) as Record<string, string>;

  if (provider === 'anthropic') {
    return {
      provider: 'anthropic',
      apiKey: config.api_key || process.env.ANTHROPIC_API_KEY || '',
      fastModel: config.fast_model || 'claude-3-5-haiku-20241022',
      smartModel: config.smart_model || 'claude-sonnet-4-20250514',
    };
  }

  return {
    provider: 'openai',
    apiKey: config.api_key || process.env.OPENAI_API_KEY || '',
    fastModel: config.fast_model || 'gpt-4o-mini',
    smartModel: config.smart_model || 'gpt-4o',
  };
}

export async function chatCompletion(
  config: LLMConfig,
  messages: LLMMessage[],
  options?: { model?: 'fast' | 'smart'; json?: boolean }
): Promise<LLMResponse> {
  const model = options?.model === 'smart' ? config.smartModel : config.fastModel;

  if (config.provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: config.apiKey });

    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const nonSystemMsgs = messages.filter(m => m.role !== 'system');

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemMsg,
      messages: nonSystemMsgs.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return {
      content: text,
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
    };
  }

  // OpenAI (default)
  const client = new OpenAI({ apiKey: config.apiKey });
  const response = await client.chat.completions.create({
    model,
    messages,
    ...(options?.json ? { response_format: { type: 'json_object' as const } } : {}),
  });

  return {
    content: response.choices[0].message.content || '',
    usage: response.usage ? {
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
    } : undefined,
  };
}
