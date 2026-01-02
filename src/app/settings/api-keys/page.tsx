'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, LoadingState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
      if (!userData) return;

      const { data } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, created_at, last_used_at')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false });

      setKeys(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim()) { setError('Enter a name'); return; }
    setCreating(true);
    setError('');

    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Failed');

      const data = await res.json();
      setNewKey(data.key);
      setNewName('');
      await loadKeys();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key?')) return;
    try {
      await fetch(`/api/keys/${id}`, { method: 'DELETE' });
      await loadKeys();
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) return <DashboardLayout><div className="p-6"><LoadingState /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-3xl">
          <PageHeader
            title="API Keys"
            description="Manage SDK access"
            actions={
              <Button size="sm" onClick={() => { setShowForm(true); setNewKey(null); setError(''); }}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </Button>
            }
          />

          {/* New Key Banner */}
          {newKey && (
            <Card className="mb-4 border-emerald-900/50 bg-emerald-950/20" padding="sm">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-400 font-medium">Key created - copy now</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-[11px] text-zinc-200 font-mono truncate">
                      {newKey}
                    </code>
                    <Button size="xs" variant="secondary" onClick={() => navigator.clipboard.writeText(newKey)}>Copy</Button>
                  </div>
                </div>
                <button onClick={() => setNewKey(null)} className="text-zinc-600 hover:text-zinc-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </Card>
          )}

          {/* Create Form */}
          {showForm && !newKey && (
            <Card className="mb-4" padding="sm">
              <p className="text-xs text-zinc-300 mb-2">New API Key</p>
              {error && <p className="text-[10px] text-red-400 mb-2">{error}</p>}
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name (e.g., Production)"
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
                <Button size="sm" onClick={handleCreate} loading={creating}>Create</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setNewName(''); }}>Cancel</Button>
              </div>
            </Card>
          )}

          {/* Keys List */}
          <Card padding="none">
            {keys.length === 0 ? (
              <EmptyState
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>}
                title="No API keys"
                description="Create one to use the SDK"
              />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/50">
                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">Name</th>
                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">Key</th>
                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">Created</th>
                    <th className="text-left px-3 py-2 text-zinc-500 font-medium">Last used</th>
                    <th className="text-right px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key.id} className="border-b border-zinc-800/30 last:border-0 hover:bg-zinc-800/20">
                      <td className="px-3 py-2 text-zinc-200">{key.name}</td>
                      <td className="px-3 py-2 text-zinc-500 font-mono">{key.key_prefix}...</td>
                      <td className="px-3 py-2 text-zinc-600">{formatDate(key.created_at)}</td>
                      <td className="px-3 py-2 text-zinc-600">{key.last_used_at ? formatDate(key.last_used_at) : '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="xs" variant="ghost" onClick={() => handleRevoke(key.id)} className="text-red-400 hover:text-red-300">
                          Revoke
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {/* Usage */}
          <Card className="mt-4" padding="sm">
            <p className="text-[10px] text-zinc-500 mb-2">Usage</p>
            <div className="bg-zinc-950 rounded p-2 font-mono text-[10px]">
              <span className="text-zinc-600">$ </span>
              <span className="text-emerald-400">pip install context-graph</span>
              <br />
              <span className="text-zinc-600">{'>>> '}</span>
              <span className="text-zinc-300">cg = ContextGraph(api_key=</span>
              <span className="text-amber-400">"..."</span>
              <span className="text-zinc-300">)</span>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
