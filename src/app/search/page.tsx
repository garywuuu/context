'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';

interface Decision {
  id: string;
  agent_id: string;
  timestamp: string;
  action_taken: string;
  confidence: number;
  context_snapshot: Record<string, unknown>;
  outcome?: string;
}

interface SearchResult {
  decision: Decision;
  similarity: number;
  contexts: Array<{ source: string; content: string }>;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, limit: 10 }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl">
          <PageHeader
            title="Search"
            description="Semantic search across decisions"
          />

          {/* Search */}
          <div className="flex gap-2 mb-6">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Describe a scenario..."
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim()} loading={searching}>
              Search
            </Button>
          </div>

          {/* Results */}
          {searched && (
            <div className="space-y-2">
              {searching ? (
                <ListSkeleton count={3} />
              ) : results.length > 0 ? (
                <>
                  <p className="text-[10px] text-zinc-500 mb-3">{results.length} results</p>
                  {results.map((result, idx) => (
                    <Card key={result.decision.id || idx} variant="interactive" padding="sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="info">{result.decision.agent_id}</Badge>
                          </div>
                          <p className="text-xs text-zinc-200">{result.decision.action_taken}</p>
                          {result.contexts.length > 0 && (
                            <p className="text-[10px] text-zinc-600 mt-1 truncate">
                              {result.contexts[0]?.content.slice(0, 100)}...
                            </p>
                          )}
                        </div>
                        <Badge variant={result.similarity >= 0.8 ? 'success' : result.similarity >= 0.5 ? 'warning' : 'muted'}>
                          {(result.similarity * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </>
              ) : (
                <EmptyState
                  icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>}
                  title="No matches"
                  description="Try a different query"
                />
              )}
            </div>
          )}

          {!searched && (
            <EmptyState
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>}
              title="Search decisions"
              description="Describe a scenario to find similar past decisions"
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
