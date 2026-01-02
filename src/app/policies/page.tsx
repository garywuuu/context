'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

interface Policy {
  id: string;
  extracted_policy: string;
  human_explanation: string;
  created_at: string;
  decision_id: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/overrides?policies_only=true&limit=50')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPolicies(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl">
          <PageHeader
            title="Policies"
            description="Extracted from human overrides"
          />

          <div className="space-y-2">
            {loading ? (
              <ListSkeleton count={3} />
            ) : policies.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>}
                title="No policies"
                description="Policies are extracted when humans override decisions"
              />
            ) : (
              policies.map((policy, idx) => (
                <Card key={policy.id || idx} padding="sm">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-cyan-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-200 mb-1">{policy.extracted_policy}</p>
                      <p className="text-[10px] text-zinc-500">
                        <span className="text-zinc-600">Human:</span> {policy.human_explanation}
                      </p>
                      {policy.created_at && (
                        <p className="text-[10px] text-zinc-700 mt-2">{formatDate(policy.created_at)}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card className="mt-6" padding="sm">
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-400 font-medium">How it works:</span> When humans override agent decisions,
              the system extracts policies from their explanations to improve future behavior.
            </p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
