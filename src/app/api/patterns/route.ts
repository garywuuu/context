import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Pattern, PatternDiscoveryRequest, Decision } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, setOrganizationContext, AuthenticationError } from '@/lib/auth';

// POST /api/patterns - Discover patterns from decisions
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const body: PatternDiscoveryRequest = await request.json();
    const minSampleSize = body.min_sample_size || 5;
    const confidenceThreshold = body.confidence_threshold || 0.6;

    // Fetch all decisions for analysis
    const { data: decisions, error: fetchError } = await supabaseAdmin
      .from('decisions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const discoveredPatterns: Partial<Pattern>[] = [];

    // Pattern 1: Agent Success Rates
    const agentStats = analyzeAgentSuccessRates(decisions || []);
    for (const [agentId, stats] of Object.entries(agentStats)) {
      if (stats.total >= minSampleSize) {
        const successRate = stats.successful / stats.total;
        if (successRate >= confidenceThreshold || successRate <= (1 - confidenceThreshold)) {
          discoveredPatterns.push({
            id: uuidv4(),
            organization_id: auth.organizationId,
            name: `${agentId} success pattern`,
            description: `Agent ${agentId} has ${(successRate * 100).toFixed(0)}% success rate`,
            pattern_type: 'success_factor',
            conditions: [{ field: 'agent_id', operator: 'equals', value: agentId }],
            outcomes: [{ description: successRate > 0.5 ? 'High success rate' : 'Low success rate', probability: successRate }],
            confidence: Math.abs(successRate - 0.5) * 2, // How far from 50/50
            sample_size: stats.total,
            decision_ids: stats.decisionIds.slice(0, 10),
            is_active: true,
          });
        }
      }
    }

    // Pattern 2: Confidence vs Override Correlation
    const confidencePatterns = analyzeConfidenceOverrides(decisions || []);
    for (const pattern of confidencePatterns) {
      if (pattern.sampleSize >= minSampleSize && pattern.confidence >= confidenceThreshold) {
        discoveredPatterns.push({
          id: uuidv4(),
          organization_id: auth.organizationId,
          name: pattern.name,
          description: pattern.description,
          pattern_type: 'correlation',
          conditions: pattern.conditions,
          outcomes: pattern.outcomes,
          confidence: pattern.confidence,
          sample_size: pattern.sampleSize,
          decision_ids: pattern.decisionIds,
          is_active: true,
        });
      }
    }

    // Pattern 3: Context-based patterns
    const contextPatterns = analyzeContextPatterns(decisions || []);
    for (const pattern of contextPatterns) {
      if (pattern.sampleSize >= minSampleSize && pattern.confidence >= confidenceThreshold) {
        discoveredPatterns.push({
          id: uuidv4(),
          organization_id: auth.organizationId,
          name: pattern.name,
          description: pattern.description,
          pattern_type: 'correlation',
          conditions: pattern.conditions,
          outcomes: pattern.outcomes,
          confidence: pattern.confidence,
          sample_size: pattern.sampleSize,
          decision_ids: pattern.decisionIds,
          is_active: true,
        });
      }
    }

    // Save discovered patterns
    if (discoveredPatterns.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('patterns')
        .upsert(discoveredPatterns, { onConflict: 'id' });

      if (insertError) {
        console.error('Error saving patterns:', insertError);
      }
    }

    return NextResponse.json({
      patterns: discoveredPatterns,
      analyzed_decisions: decisions?.length || 0,
      discovery_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error discovering patterns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/patterns - List discovered patterns
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request);
    await setOrganizationContext(auth.organizationId);

    const { searchParams } = new URL(request.url);
    const patternType = searchParams.get('type');
    const activeOnly = searchParams.get('active') !== 'false';

    let query = supabaseAdmin
      .from('patterns')
      .select('*')
      .order('confidence', { ascending: false });

    if (patternType) {
      query = query.eq('pattern_type', patternType);
    }
    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching patterns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions for pattern analysis

interface AgentStats {
  total: number;
  successful: number;
  decisionIds: string[];
}

function analyzeAgentSuccessRates(decisions: Decision[]): Record<string, AgentStats> {
  const stats: Record<string, AgentStats> = {};

  for (const decision of decisions) {
    if (!stats[decision.agent_id]) {
      stats[decision.agent_id] = { total: 0, successful: 0, decisionIds: [] };
    }
    stats[decision.agent_id].total++;
    stats[decision.agent_id].decisionIds.push(decision.id);

    // Consider high confidence + positive outcome as successful
    if (decision.confidence >= 0.7 && (!decision.outcome || !decision.outcome.toLowerCase().includes('fail'))) {
      stats[decision.agent_id].successful++;
    }
  }

  return stats;
}

interface AnalyzedPattern {
  name: string;
  description: string;
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  outcomes: Array<{ description: string; probability: number }>;
  confidence: number;
  sampleSize: number;
  decisionIds: string[];
}

function analyzeConfidenceOverrides(decisions: Decision[]): AnalyzedPattern[] {
  const patterns: AnalyzedPattern[] = [];

  // Group by confidence ranges
  const lowConfidence = decisions.filter(d => d.confidence < 0.5);
  const highConfidence = decisions.filter(d => d.confidence >= 0.8);

  if (lowConfidence.length >= 5) {
    const overrideRate = lowConfidence.filter(d =>
      d.outcome?.toLowerCase().includes('override') ||
      d.outcome?.toLowerCase().includes('corrected')
    ).length / lowConfidence.length;

    if (overrideRate > 0.3) {
      patterns.push({
        name: 'Low confidence decisions need review',
        description: `${(overrideRate * 100).toFixed(0)}% of low-confidence decisions get overridden`,
        conditions: [{ field: 'confidence', operator: 'less_than', value: 0.5 }],
        outcomes: [{ description: 'Higher override rate', probability: overrideRate }],
        confidence: overrideRate,
        sampleSize: lowConfidence.length,
        decisionIds: lowConfidence.slice(0, 10).map(d => d.id),
      });
    }
  }

  if (highConfidence.length >= 5) {
    const successRate = highConfidence.filter(d =>
      !d.outcome?.toLowerCase().includes('fail') &&
      !d.outcome?.toLowerCase().includes('override')
    ).length / highConfidence.length;

    if (successRate > 0.7) {
      patterns.push({
        name: 'High confidence decisions succeed',
        description: `${(successRate * 100).toFixed(0)}% of high-confidence decisions succeed`,
        conditions: [{ field: 'confidence', operator: 'greater_than', value: 0.8 }],
        outcomes: [{ description: 'Higher success rate', probability: successRate }],
        confidence: successRate,
        sampleSize: highConfidence.length,
        decisionIds: highConfidence.slice(0, 10).map(d => d.id),
      });
    }
  }

  return patterns;
}

function analyzeContextPatterns(decisions: Decision[]): AnalyzedPattern[] {
  const patterns: AnalyzedPattern[] = [];

  // Analyze common context keys
  const contextKeys: Record<string, { values: Record<string, { count: number; decisions: string[] }> }> = {};

  for (const decision of decisions) {
    for (const [key, value] of Object.entries(decision.context_snapshot || {})) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        if (!contextKeys[key]) {
          contextKeys[key] = { values: {} };
        }
        const valueStr = String(value);
        if (!contextKeys[key].values[valueStr]) {
          contextKeys[key].values[valueStr] = { count: 0, decisions: [] };
        }
        contextKeys[key].values[valueStr].count++;
        contextKeys[key].values[valueStr].decisions.push(decision.id);
      }
    }
  }

  // Find context values that appear frequently
  for (const [key, data] of Object.entries(contextKeys)) {
    for (const [value, stats] of Object.entries(data.values)) {
      if (stats.count >= 5 && stats.count / decisions.length >= 0.1) {
        patterns.push({
          name: `Common context: ${key}=${value}`,
          description: `${stats.count} decisions (${((stats.count / decisions.length) * 100).toFixed(0)}%) have ${key}=${value}`,
          conditions: [{ field: `context_snapshot.${key}`, operator: 'equals', value }],
          outcomes: [{ description: 'Frequently occurring context', probability: stats.count / decisions.length }],
          confidence: stats.count / decisions.length,
          sampleSize: stats.count,
          decisionIds: stats.decisions.slice(0, 10),
        });
      }
    }
  }

  return patterns;
}
