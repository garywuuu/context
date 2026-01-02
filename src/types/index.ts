// Core types for Context Graph

// ============================================
// CAPABILITIES & GOALS
// ============================================

export interface Capability {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category?: string; // 'product', 'service', 'technical'
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  target_date?: string;
  status: 'active' | 'achieved' | 'abandoned';
  success_metrics?: SuccessMetric[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SuccessMetric {
  name: string;
  target: string | number;
  current?: string | number;
  unit?: string;
}

// ============================================
// SOURCES (Weighted Context Sources)
// ============================================

export interface DecisionSource {
  type: ContextSource;
  content: string;
  weight: number; // 0-1, higher = more influential
  participant?: string; // Who provided this (for meetings, etc.)
  role?: string; // 'decision_maker' | 'influencer' | 'end_user' | 'technical'
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export type ContextSource =
  | 'CRM'
  | 'EMAIL'
  | 'SLACK'
  | 'MEETING'
  | 'DOCUMENT'
  | 'AGENT_REASONING'
  | 'HUMAN_INPUT'
  | 'API'
  | 'EXTERNAL_DATA'
  | 'OTHER';

// ============================================
// DECISIONS (Enhanced)
// ============================================

export interface Decision {
  id: string;
  agent_id: string;
  timestamp: string;
  action_taken: string;
  confidence: number;
  context_snapshot: Record<string, unknown>;
  policies_evaluated: PolicyEvaluation[];
  outcome?: string;
  embedding?: number[];
  // New fields
  reasoning?: string; // WHY the decision was made
  sources?: DecisionSource[]; // Weighted sources that informed this
  linked_capabilities?: string[]; // UUIDs of related capabilities
  linked_goals?: string[]; // UUIDs of related goals
  created_at: string;
}

export interface PolicyEvaluation {
  policy_id: string;
  policy_name: string;
  passed: boolean;
  details?: string;
}

// ============================================
// CAPABILITY & GOAL LINKS
// ============================================

export interface DecisionCapabilityLink {
  id: string;
  decision_id: string;
  capability_id: string;
  match_type: 'strong' | 'partial' | 'mismatch';
  auto_linked: boolean;
  created_at: string;
  capability?: Capability; // Joined data
}

export interface DecisionGoalLink {
  id: string;
  decision_id: string;
  goal_id: string;
  relevance: 'advances' | 'neutral' | 'hinders';
  auto_linked: boolean;
  created_at: string;
  goal?: Goal; // Joined data
}

// ============================================
// PATTERNS
// ============================================

export interface Pattern {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  pattern_type: 'correlation' | 'sequence' | 'anomaly' | 'success_factor';
  conditions: PatternCondition[];
  outcomes: PatternOutcome[];
  confidence: number; // 0-1
  sample_size: number;
  decision_ids?: string[];
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PatternCondition {
  field: string; // e.g., 'agent_id', 'confidence', 'context_snapshot.customer_type'
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'exists';
  value: unknown;
}

export interface PatternOutcome {
  description: string;
  probability: number; // 0-1
  metric?: string;
  value?: unknown;
}

// ============================================
// CONTEXTS
// ============================================

export interface Context {
  id: string;
  decision_id: string;
  source: ContextSource;
  content: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================
// OVERRIDES
// ============================================

export interface Override {
  id: string;
  original_decision_id: string;
  correction: string;
  human_explanation: string;
  extracted_policy?: string;
  created_by?: string;
  created_at: string;
}

// ============================================
// API REQUEST TYPES
// ============================================

export interface CreateDecisionRequest {
  agent_id: string;
  action_taken: string;
  confidence: number;
  context_snapshot: Record<string, unknown>;
  policies_evaluated?: PolicyEvaluation[];
  outcome?: string;
  // New fields
  reasoning?: string;
  sources?: DecisionSource[];
}

export interface CreateOverrideRequest {
  original_decision_id: string;
  correction: string;
  human_explanation: string;
  created_by?: string;
}

export interface CreateCapabilityRequest {
  name: string;
  description?: string;
  category?: string;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  metadata?: Record<string, unknown>;
}

export interface CreateGoalRequest {
  name: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  target_date?: string;
  success_metrics?: SuccessMetric[];
  metadata?: Record<string, unknown>;
}

export interface SearchRequest {
  query: string;
  agent_id?: string;
  limit?: number;
  threshold?: number;
}

export interface SearchResult {
  decision: Decision;
  similarity: number;
  contexts: Context[];
}

// ============================================
// PATTERN DISCOVERY TYPES
// ============================================

export interface PatternDiscoveryRequest {
  min_sample_size?: number; // Minimum decisions to consider a pattern
  confidence_threshold?: number; // Minimum confidence (0-1)
  pattern_types?: Pattern['pattern_type'][];
}

export interface PatternDiscoveryResult {
  patterns: Pattern[];
  analyzed_decisions: number;
  discovery_timestamp: string;
}
