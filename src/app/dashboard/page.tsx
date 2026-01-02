'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';

interface Stats {
  totalDecisions: number;
  totalPolicies: number;
  recentAgents: string[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalDecisions: 0,
    totalPolicies: 0,
    recentAgents: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [decisionsRes, policiesRes] = await Promise.all([
          fetch('/api/decisions?limit=100'),
          fetch('/api/overrides?policies_only=true&limit=100'),
        ]);

        const decisions = await decisionsRes.json();
        const policies = await policiesRes.json();

        const agents = Array.isArray(decisions)
          ? [...new Set(decisions.map((d: { agent_id: string }) => d.agent_id))]
          : [];

        setStats({
          totalDecisions: Array.isArray(decisions) ? decisions.length : 0,
          totalPolicies: Array.isArray(policies) ? policies.length : 0,
          recentAgents: agents.slice(0, 5),
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Decisions', value: stats.totalDecisions, href: '/decisions', color: 'cyan' },
    { label: 'Policies', value: stats.totalPolicies, href: '/policies', color: 'emerald' },
    { label: 'Agents', value: stats.recentAgents.length, href: '/decisions', color: 'violet' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl">
          <PageHeader
            title="Dashboard"
            description="Decision traces and organizational memory"
          />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {statCards.map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <Card variant="interactive" padding="sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500 uppercase tracking-wide">{stat.label}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      stat.color === 'cyan' ? 'bg-cyan-500' :
                      stat.color === 'emerald' ? 'bg-emerald-500' : 'bg-violet-500'
                    }`} />
                  </div>
                  <div className="text-xl font-semibold text-zinc-100 mt-1">
                    {loading ? <div className="h-6 w-8 bg-zinc-800 rounded animate-pulse" /> : stat.value}
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <SectionHeader title="Quick Actions" />
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Link href="/search">
              <Card variant="interactive" padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-cyan-600/20 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-200">Search</p>
                    <p className="text-[10px] text-zinc-500">Find past decisions</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/settings/api-keys">
              <Card variant="interactive" padding="sm">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-zinc-700/50 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-zinc-200">API Keys</p>
                    <p className="text-[10px] text-zinc-500">Manage access</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Agents */}
          {!loading && stats.recentAgents.length > 0 && (
            <>
              <SectionHeader title="Active Agents" />
              <Card padding="none">
                <div className="divide-y divide-zinc-800/50">
                  {stats.recentAgents.map((agent) => (
                    <div key={agent} className="px-3 py-2 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                      <span className="text-xs text-zinc-300 font-mono">{agent}</span>
                      <Badge variant="success">active</Badge>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!loading && stats.totalDecisions === 0 && (
            <Card className="mt-6">
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>}
                title="Get started"
                description="Log decisions via SDK to build your memory graph"
                action={
                  <div className="space-y-3 w-full max-w-xs">
                    <div className="bg-zinc-950 rounded p-3 font-mono text-[11px] text-left">
                      <span className="text-zinc-500">$ </span>
                      <span className="text-emerald-400">pip install context-graph</span>
                    </div>
                    <Link href="/settings/api-keys">
                      <Button size="sm" className="w-full">Create API Key</Button>
                    </Link>
                  </div>
                }
              />
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
