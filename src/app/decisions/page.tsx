'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge, ConfidenceBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';
import { formatDateTime } from '@/lib/utils';

interface Decision {
  id: string;
  agent_id: string;
  timestamp: string;
  action_taken: string;
  confidence: number;
  context_snapshot: Record<string, unknown>;
  outcome?: string;
}

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/decisions?limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDecisions(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl">
          <PageHeader
            title="Decisions"
            description="Agent decision log"
          />

          <div className="space-y-2">
            {loading ? (
              <ListSkeleton count={5} />
            ) : decisions.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>}
                title="No decisions"
                description="Use the SDK or API to log decisions"
              />
            ) : (
              decisions.map((decision) => (
                <Card key={decision.id} variant="interactive" padding="sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="info">{decision.agent_id}</Badge>
                        <span className="text-[10px] text-zinc-600">{formatDateTime(decision.timestamp)}</span>
                      </div>
                      <p className="text-xs text-zinc-200 truncate">{decision.action_taken}</p>
                    </div>
                    <ConfidenceBadge confidence={decision.confidence} />
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
