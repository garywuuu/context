'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';

interface Goal {
  id: string;
  name: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'achieved' | 'abandoned';
  target_date?: string;
  created_at: string;
}

const priorityColors = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'muted',
} as const;

const statusColors = {
  active: 'success',
  achieved: 'info',
  abandoned: 'muted',
} as const;

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newGoal, setNewGoal] = useState({
    name: '',
    description: '',
    priority: 'medium' as const,
    target_date: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newGoal.name.trim()) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGoal,
          target_date: newGoal.target_date || undefined,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      await loadGoals();
      setShowForm(false);
      setNewGoal({ name: '', description: '', priority: 'medium', target_date: '' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status !== 'active');

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-3xl">
          <PageHeader
            title="Goals"
            description="Define organizational objectives"
            actions={
              <Button size="sm" onClick={() => { setShowForm(true); setError(''); }}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Goal
              </Button>
            }
          />

          {/* Create Form */}
          {showForm && (
            <Card className="mb-4" padding="sm">
              <p className="text-xs text-zinc-300 mb-3">New Goal</p>
              {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                    placeholder="e.g., Achieve 90% forecast accuracy"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    placeholder="Why this goal matters"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      value={newGoal.priority}
                      onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value as Goal['priority'] })}
                      className="w-full px-2.5 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="target_date">Target Date</Label>
                    <Input
                      id="target_date"
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleCreate} loading={creating}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Goals List */}
          <div className="space-y-2">
            {loading ? (
              <ListSkeleton count={3} />
            ) : goals.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>}
                title="No goals defined"
                description="Add goals to track organizational objectives"
              />
            ) : (
              <>
                {activeGoals.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Active Goals</p>
                    <div className="space-y-2">
                      {activeGoals.map((goal) => (
                        <Card key={goal.id} padding="sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-zinc-200">{goal.name}</span>
                                <Badge variant={priorityColors[goal.priority]} size="xs">{goal.priority}</Badge>
                                <Badge variant={statusColors[goal.status]} size="xs">{goal.status}</Badge>
                              </div>
                              {goal.description && (
                                <p className="text-[10px] text-zinc-500">{goal.description}</p>
                              )}
                              {goal.target_date && (
                                <p className="text-[10px] text-zinc-600 mt-1">
                                  Target: {new Date(goal.target_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                {completedGoals.length > 0 && (
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Completed</p>
                    <div className="space-y-2 opacity-60">
                      {completedGoals.map((goal) => (
                        <Card key={goal.id} padding="sm">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">{goal.name}</span>
                            <Badge variant={statusColors[goal.status]} size="xs">{goal.status}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <Card className="mt-6" padding="sm">
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-400 font-medium">How it works:</span> Goals define what your organization wants to achieve.
              Decisions are automatically analyzed for alignment with these goals, helping identify which decisions advance or hinder progress.
            </p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
