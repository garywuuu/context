'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge, ConfidenceBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';
import { DecisionDocView } from '@/components/decision/DecisionDocView';
import { formatRelativeTime } from '@/lib/utils';
import type { Decision, DecisionWithContext } from '@/types';

const PAGE_SIZE = 20;

export default function DecisionsBrowsePage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedContext, setExpandedContext] = useState<DecisionWithContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  const fetchDecisions = useCallback(async (offset = 0, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (searchQuery) params.set('query', searchQuery);
      if (agentFilter) params.set('agent_id', agentFilter);

      const res = await fetch(`/api/decisions?${params}`);
      const data = await res.json();

      if (data.decisions) {
        setDecisions(prev => append ? [...prev, ...data.decisions] : data.decisions);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Error fetching decisions:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, agentFilter]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setExpandedId(null);
    setExpandedContext(null);
    fetchDecisions();
  };

  const handleLoadMore = () => {
    fetchDecisions(decisions.length, true);
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedContext(null);
      return;
    }

    setExpandedId(id);
    setExpandedContext(null);
    setLoadingContext(true);

    try {
      const res = await fetch(`/api/decisions/${id}`);
      const data = await res.json();
      if (data && data.id) {
        setExpandedContext({
          ...data,
          contexts: data.contexts || [],
          overrides: data.overrides || [],
        });
      }
    } catch (err) {
      console.error('Error fetching decision context:', err);
    } finally {
      setLoadingContext(false);
    }
  };

  const hasMore = decisions.length < total;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl">
          <PageHeader
            title="Decisions"
            description={`${total} decision${total !== 1 ? 's' : ''} documented`}
          />

          {/* Search & Filters */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search decisions…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Input
              placeholder="Agent ID"
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-32"
            />
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          {/* Active filters */}
          {(searchQuery || agentFilter) && (
            <div className="flex items-center gap-2 mb-3">
              {searchQuery && (
                <Badge variant="info" size="sm">
                  Search: {searchQuery}
                </Badge>
              )}
              {agentFilter && (
                <Badge variant="default" size="sm">
                  Agent: {agentFilter}
                </Badge>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setAgentFilter('');
                }}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Decision List */}
          <div className="space-y-2">
            {loading ? (
              <ListSkeleton count={5} />
            ) : decisions.length === 0 ? (
              <EmptyState
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
                title="No decisions found"
                description={searchQuery ? 'Try a different search query' : 'Decisions will appear here once logged via the SDK or API'}
              />
            ) : (
              decisions.map((decision) => {
                const isExpanded = expandedId === decision.id;
                return (
                  <Card
                    key={decision.id}
                    variant={isExpanded ? 'highlighted' : 'interactive'}
                    padding="none"
                  >
                    {/* Card header - always visible */}
                    <button
                      onClick={() => handleExpand(decision.id)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-200 leading-relaxed line-clamp-2">
                            {decision.action_taken}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="info" size="xs">{decision.agent_id}</Badge>
                            <span className="text-[10px] text-zinc-600">
                              {formatRelativeTime(decision.timestamp)}
                            </span>
                            {decision.reasoning && (
                              <span className="text-[10px] text-zinc-700">Has rationale</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <ConfidenceBadge confidence={decision.confidence} />
                          <Link
                            href={`/decisions/${decision.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-zinc-600 hover:text-zinc-400 transition-colors"
                            title="Open full page"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800/50 p-4">
                        {loadingContext ? (
                          <div className="flex items-center justify-center py-6">
                            <svg className="animate-spin h-4 w-4 text-zinc-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          </div>
                        ) : expandedContext ? (
                          <DecisionDocView decision={expandedContext} compact />
                        ) : (
                          <p className="text-xs text-zinc-500">Failed to load details</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Load More */}
          {hasMore && !loading && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                loading={loadingMore}
              >
                Load more ({decisions.length} of {total})
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
