'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';
import ReviewCard from '@/components/review/ReviewCard';
import ReviewEditModal from '@/components/review/ReviewEditModal';
import type { ExtractedDecision, ExtractionStatus } from '@/types/v1';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | ExtractionStatus;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Dismissed', value: 'dismissed' },
];

export default function ReviewPage() {
  const [items, setItems] = useState<ExtractedDecision[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<ExtractedDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track pending count separately for header display
  const [pendingCount, setPendingCount] = useState(0);

  const fetchItems = useCallback(
    async (offset = 0, append = false) => {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          status: statusFilter,
          limit: String(PAGE_SIZE),
          offset: String(offset),
        });

        const res = await fetch(`/api/review?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to fetch review items');
        }

        const data = await res.json();

        if (data.items) {
          setItems((prev) => (append ? [...prev, ...data.items] : data.items));
          setTotal(data.total);
        }
      } catch (err) {
        console.error('Error fetching review items:', err);
        setError(err instanceof Error ? err.message : 'Failed to load review items');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter]
  );

  // Fetch pending count for header (always show current pending count)
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/review?status=pending&limit=1&offset=0');
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.total || 0);
      }
    } catch {
      // Silently fail for pending count
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  const handleLoadMore = () => {
    fetchItems(items.length, true);
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // Confirm a single item
  const handleConfirm = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/review/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to confirm decision');
      }

      // Remove from list and update counts
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
      setPendingCount((prev) => Math.max(0, prev - 1));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error('Error confirming decision:', err);
      setError(err instanceof Error ? err.message : 'Failed to confirm');
    } finally {
      setActionLoading(null);
    }
  };

  // Dismiss a single item
  const handleDismiss = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/review/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to dismiss decision');
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotal((prev) => prev - 1);
      setPendingCount((prev) => Math.max(0, prev - 1));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      console.error('Error dismissing decision:', err);
      setError(err instanceof Error ? err.message : 'Failed to dismiss');
    } finally {
      setActionLoading(null);
    }
  };

  // Open edit modal
  const handleEditOpen = (item: ExtractedDecision) => {
    setEditingItem(item);
  };

  // Save edits and confirm
  const handleEditSave = async (edits: {
    title?: string;
    rationale?: string;
    participants?: string[];
    alternatives?: { option: string; reason_rejected?: string }[];
  }) => {
    if (!editingItem) return;

    setActionLoading(editingItem.id);
    try {
      const res = await fetch(`/api/review/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', edits }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save and confirm decision');
      }

      // Remove from list and update counts
      setItems((prev) => prev.filter((item) => item.id !== editingItem.id));
      setTotal((prev) => prev - 1);
      setPendingCount((prev) => Math.max(0, prev - 1));
      if (expandedId === editingItem.id) setExpandedId(null);
      setEditingItem(null);
    } catch (err) {
      console.error('Error saving edit:', err);
      setError(err instanceof Error ? err.message : 'Failed to save edit');
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk confirm all pending
  const handleConfirmAll = async () => {
    if (pendingCount === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to confirm all ${pendingCount} pending decision${pendingCount !== 1 ? 's' : ''}? This will create decision records for each one.`
    );
    if (!confirmed) return;

    setBulkLoading(true);
    setError(null);

    try {
      // First fetch all pending IDs
      const fetchRes = await fetch(
        `/api/review?status=pending&limit=1000&offset=0`
      );
      if (!fetchRes.ok) throw new Error('Failed to fetch pending items');
      const fetchData = await fetchRes.json();
      const pendingIds = (fetchData.items || []).map(
        (item: ExtractedDecision) => item.id
      );

      if (pendingIds.length === 0) return;

      const res = await fetch('/api/review/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', ids: pendingIds }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to bulk confirm');
      }

      const data = await res.json();

      // Refresh the list
      await fetchItems();
      await fetchPendingCount();

      if (data.processed > 0) {
        // Success handled by list refresh
      }
    } catch (err) {
      console.error('Error bulk confirming:', err);
      setError(err instanceof Error ? err.message : 'Failed to bulk confirm');
    } finally {
      setBulkLoading(false);
    }
  };

  const hasMore = items.length < total;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl">
          <PageHeader
            title="Review"
            description={`${pendingCount} pending decision${pendingCount !== 1 ? 's' : ''}`}
            actions={
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAll}
                loading={bulkLoading}
                disabled={pendingCount === 0}
              >
                Confirm All Pending
              </Button>
            }
          />

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 mb-4">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setExpandedId(null);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-150 ${
                  statusFilter === filter.value
                    ? 'bg-cyan-600/20 text-cyan-400'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Error display */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-950/30 border border-red-800/40 rounded-md">
              <p className="text-xs text-red-400">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-[10px] text-red-500 hover:text-red-400 mt-0.5"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Review cards list */}
          <div className="space-y-2">
            {loading ? (
              <ListSkeleton count={5} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                }
                title={
                  statusFilter === 'pending'
                    ? 'No pending decisions'
                    : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}decisions`
                }
                description={
                  statusFilter === 'pending'
                    ? 'Extracted decisions from Slack will appear here for review'
                    : 'Try a different filter to see other decisions'
                }
              />
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={
                    actionLoading === item.id
                      ? 'opacity-50 pointer-events-none transition-opacity'
                      : 'transition-opacity'
                  }
                >
                  <ReviewCard
                    item={item}
                    onConfirm={() => handleConfirm(item.id)}
                    onEdit={() => handleEditOpen(item)}
                    onDismiss={() => handleDismiss(item.id)}
                    expanded={expandedId === item.id}
                    onToggleExpand={() => handleToggleExpand(item.id)}
                  />
                </div>
              ))
            )}
          </div>

          {/* Load more */}
          {hasMore && !loading && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                loading={loadingMore}
              >
                Load more ({items.length} of {total})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editingItem && (
        <ReviewEditModal
          item={editingItem}
          onSave={handleEditSave}
          onClose={() => setEditingItem(null)}
        />
      )}
    </DashboardLayout>
  );
}
