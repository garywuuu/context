'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ListSkeleton } from '@/components/ui/EmptyState';

interface Capability {
  id: string;
  name: string;
  description?: string;
  category?: string;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
  created_at: string;
}

const strengthColors = {
  strong: 'success',
  moderate: 'warning',
  weak: 'muted',
  none: 'error',
} as const;

export default function CapabilitiesPage() {
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCapability, setNewCapability] = useState({
    name: '',
    description: '',
    category: '',
    strength: 'moderate' as const,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadCapabilities();
  }, []);

  async function loadCapabilities() {
    try {
      const res = await fetch('/api/capabilities');
      if (res.ok) {
        const data = await res.json();
        setCapabilities(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newCapability.name.trim()) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCapability),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      await loadCapabilities();
      setShowForm(false);
      setNewCapability({ name: '', description: '', category: '', strength: 'moderate' });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-3xl">
          <PageHeader
            title="Capabilities"
            description="Define what your organization can do"
            actions={
              <Button size="sm" onClick={() => { setShowForm(true); setError(''); }}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Capability
              </Button>
            }
          />

          {/* Create Form */}
          {showForm && (
            <Card className="mb-4" padding="sm">
              <p className="text-xs text-zinc-300 mb-3">New Capability</p>
              {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newCapability.name}
                    onChange={(e) => setNewCapability({ ...newCapability, name: e.target.value })}
                    placeholder="e.g., Accurate Forecasting"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newCapability.description}
                    onChange={(e) => setNewCapability({ ...newCapability, description: e.target.value })}
                    placeholder="What this capability enables"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={newCapability.category}
                      onChange={(e) => setNewCapability({ ...newCapability, category: e.target.value })}
                      placeholder="e.g., product, service"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="strength">Strength</Label>
                    <select
                      id="strength"
                      value={newCapability.strength}
                      onChange={(e) => setNewCapability({ ...newCapability, strength: e.target.value as Capability['strength'] })}
                      className="w-full px-2.5 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="strong">Strong</option>
                      <option value="moderate">Moderate</option>
                      <option value="weak">Weak</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleCreate} loading={creating}>Create</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </div>
            </Card>
          )}

          {/* Capabilities List */}
          <div className="space-y-2">
            {loading ? (
              <ListSkeleton count={3} />
            ) : capabilities.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>}
                title="No capabilities defined"
                description="Add capabilities to ground your agents' decisions"
              />
            ) : (
              capabilities.map((cap) => (
                <Card key={cap.id} padding="sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-zinc-200">{cap.name}</span>
                        <Badge variant={strengthColors[cap.strength]} size="xs">{cap.strength}</Badge>
                        {cap.category && (
                          <Badge variant="muted" size="xs">{cap.category}</Badge>
                        )}
                      </div>
                      {cap.description && (
                        <p className="text-[10px] text-zinc-500">{cap.description}</p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <Card className="mt-6" padding="sm">
            <p className="text-[11px] text-zinc-500">
              <span className="text-zinc-400 font-medium">How it works:</span> Capabilities define what your organization can deliver.
              When decisions are logged, they&apos;re automatically matched against these capabilities to identify alignment or gaps.
            </p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
