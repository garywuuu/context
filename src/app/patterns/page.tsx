'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';

interface Pattern {
  id: string;
  name: string;
  description?: string;
  pattern_type: 'correlation' | 'sequence' | 'anomaly' | 'success_factor';
  confidence: number;
  sample_size: number;
  is_active: boolean;
  conditions: Array<{ field: string; operator: string; value: unknown }>;
  outcomes: Array<{ description: string; probability: number }>;
  created_at: string;
}

const typeColors = {
  correlation: 'info',
  sequence: 'warning',
  anomaly: 'error',
  success_factor: 'success',
} as const;

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [lastDiscovery, setLastDiscovery] = useState<{ analyzed: number; found: number } | null>(null);

  useEffect(() => {
    loadPatterns();
  }, []);

  async function loadPatterns() {
    try {
      const res = await fetch('/api/patterns');
      if (res.ok) {
        const data = await res.json();
        setPatterns(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDiscover() {
    setDiscovering(true);
    try {
      const res = await fetch('/api/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_sample_size: 3,
          confidence_threshold: 0.5,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastDiscovery({
          analyzed: data.analyzed_decisions,
          found: data.patterns.length,
        });
        await loadPatterns();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDiscovering(false);
    }
  }

  const groupedPatterns = patterns.reduce((acc, pattern) => {
    if (!acc[pattern.pattern_type]) {
      acc[pattern.pattern_type] = [];
    }
    acc[pattern.pattern_type].push(pattern);
    return acc;
  }, {} as Record<string, Pattern[]>);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl">
          <PageHeader
            title="Patterns"
            description="Discovered insights from decision history"
            actions={
              <Button size="sm" onClick={handleDiscover} loading={discovering}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Discover Patterns
              </Button>
            }
          />

          {/* Discovery Result */}
          {lastDiscovery && (
            <Card className="mb-4 border-cyan-900/50 bg-cyan-950/20" padding="sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-xs text-cyan-400">
                  Analyzed {lastDiscovery.analyzed} decisions, found {lastDiscovery.found} patterns
                </p>
                <button onClick={() => setLastDiscovery(null)} className="ml-auto text-zinc-600 hover:text-zinc-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </Card>
          )}

          {/* Patterns List */}
          <div className="space-y-6">
            {loading ? (
              <ListSkeleton count={3} />
            ) : patterns.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>}
                title="No patterns discovered"
                description="Click 'Discover Patterns' to analyze your decision history"
              />
            ) : (
              Object.entries(groupedPatterns).map(([type, typePatterns]) => (
                <div key={type}>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Badge variant={typeColors[type as keyof typeof typeColors]} size="xs">
                      {type.replace('_', ' ')}
                    </Badge>
                    <span>{typePatterns.length} patterns</span>
                  </p>
                  <div className="space-y-2">
                    {typePatterns.map((pattern) => (
                      <Card key={pattern.id} padding="sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-zinc-200">{pattern.name}</span>
                              <Badge
                                variant={pattern.confidence >= 0.8 ? 'success' : pattern.confidence >= 0.6 ? 'warning' : 'muted'}
                                size="xs"
                              >
                                {(pattern.confidence * 100).toFixed(0)}% confidence
                              </Badge>
                            </div>
                            {pattern.description && (
                              <p className="text-[10px] text-zinc-400 mb-2">{pattern.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-[10px] text-zinc-600">
                              <span>Based on {pattern.sample_size} decisions</span>
                              {pattern.outcomes[0] && (
                                <span className="text-zinc-500">
                                  {pattern.outcomes[0].description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <Card className="mt-6" padding="sm">
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-400 font-medium">How it works:</span> Pattern discovery analyzes your decision history
              to find correlations, success factors, and anomalies. Patterns are automatically updated as new decisions are logged.
            </p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
