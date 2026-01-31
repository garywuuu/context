export interface Integration {
  id: string;
  organization_id: string;
  provider: string;
  status: 'pending' | 'active' | 'error' | 'revoked';
  credentials: Record<string, unknown>;
  settings: Record<string, unknown>;
  connected_by?: string;
  connected_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface SlackChannel {
  id: string;
  integration_id: string;
  organization_id: string;
  channel_id: string;
  channel_name: string;
  is_active: boolean;
  last_synced_at?: string;
  cursor?: string;
  created_at: string;
}

export interface SlackMessage {
  id: string;
  organization_id: string;
  integration_id: string;
  channel_id: string;
  message_ts: string;
  thread_ts?: string;
  user_id?: string;
  user_name?: string;
  content: string;
  raw_payload: Record<string, unknown>;
  ingested_at: string;
}

export type ExtractionStatus = 'pending' | 'confirmed' | 'edited' | 'dismissed';

export interface ExtractedDecision {
  id: string;
  organization_id: string;
  source_type: string;
  source_channel?: string;
  source_thread_ts?: string;
  source_url?: string;
  source_message_ids?: string[];
  title: string;
  rationale?: string;
  participants: string[];
  alternatives: { option: string; reason_rejected?: string }[];
  confidence: number;
  raw_extraction: Record<string, unknown>;
  status: ExtractionStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  decision_id?: string;
  extracted_at: string;
  source_timestamp?: string;
}

export type LLMProvider = 'openai' | 'anthropic';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  fastModel: string;
  smartModel: string;
}
