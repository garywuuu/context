'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/EmptyState';

interface SlackChannel {
  id: string;
  name: string;
  num_members: number;
  is_private: boolean;
  is_member: boolean;
  is_monitored: boolean;
}

interface ChannelSelectorProps {
  onSaved?: () => void;
}

export default function ChannelSelector({ onSaved }: ChannelSelectorProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchChannels();
  }, []);

  async function fetchChannels() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/slack/channels');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch channels');
      }
      const data = await res.json();
      const channelList = data.channels as SlackChannel[];
      setChannels(channelList);

      // Pre-select currently monitored channels
      const monitored = new Set(
        channelList.filter((c) => c.is_monitored).map((c) => c.id)
      );
      setSelected(monitored);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/slack/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_ids: Array.from(selected) }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save channels');
      }

      setMessage(`Saved ${selected.size} channel${selected.size !== 1 ? 's' : ''}`);
      setTimeout(() => setMessage(''), 3000);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function toggleChannel(channelId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filteredChannels.map((c) => c.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  if (loading) {
    return <LoadingState />;
  }

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-950/30 border border-red-900/50 rounded-md">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {message && (
        <div className="mb-3 px-3 py-2 bg-emerald-950/30 border border-emerald-900/50 rounded-md">
          <p className="text-xs text-emerald-400">{message}</p>
        </div>
      )}

      {/* Search and actions bar */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          placeholder="Filter channels..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-2.5 py-1.5 text-sm bg-zinc-900 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-600/50 transition-all duration-150"
        />
        <Button size="xs" variant="ghost" onClick={selectAll}>
          Select All
        </Button>
        <Button size="xs" variant="ghost" onClick={deselectAll}>
          Deselect All
        </Button>
      </div>

      {/* Channel count */}
      <p className="text-[10px] text-zinc-600 mb-2">
        {selected.size} of {channels.length} channels selected
      </p>

      {/* Channel list */}
      <Card padding="none" className="max-h-72 overflow-y-auto">
        {filteredChannels.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-zinc-500">
              {channels.length === 0
                ? 'No channels found. Make sure the bot is invited to channels.'
                : 'No channels match your filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/30">
            {filteredChannels.map((channel) => (
              <label
                key={channel.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/20 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.has(channel.id)}
                  onChange={() => toggleChannel(channel.id)}
                  className="rounded border-zinc-700 bg-zinc-900 text-cyan-600 focus:ring-cyan-500/50 focus:ring-offset-0 h-3.5 w-3.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-zinc-200">
                    {channel.is_private ? '🔒 ' : '# '}
                    {channel.name}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-600">
                  {channel.num_members} member{channel.num_members !== 1 ? 's' : ''}
                </span>
              </label>
            ))}
          </div>
        )}
      </Card>

      {/* Save button */}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          loading={saving}
          disabled={saving}
        >
          Save Channel Selection
        </Button>
      </div>
    </div>
  );
}
