'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { createClient } from '@/lib/supabase-browser';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader, SectionHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/EmptyState';
import ChannelSelector from '@/components/slack/ChannelSelector';
import { formatRelativeTime } from '@/lib/utils';

interface Integration {
  id: string;
  provider: string;
  status: string;
  credentials: Record<string, unknown>;
  connected_at: string | null;
  error_message: string | null;
}

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillMonths, setBackfillMonths] = useState(3);
  const [backfillMessage, setBackfillMessage] = useState('');
  const [showChannelSelector, setShowChannelSelector] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  // Check URL params for connection status
  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'slack') {
      setSuccessMessage('Slack connected successfully! Now select channels to monitor.');
      setShowChannelSelector(true);
      setTimeout(() => setSuccessMessage(''), 5000);
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: 'Failed to initiate Slack connection.',
        state_mismatch: 'Security check failed. Please try again.',
        no_code: 'No authorization code received from Slack.',
        db_error: 'Failed to save integration. Please try again.',
        access_denied: 'Slack access was denied.',
      };
      setErrorMessage(errorMessages[error] || `Connection error: ${error}`);
      setTimeout(() => setErrorMessage(''), 8000);
    }
  }, [searchParams]);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData) return;

      const { data } = await supabase
        .from('integrations')
        .select('id, provider, status, credentials, connected_at, error_message')
        .eq('organization_id', userData.organization_id)
        .order('created_at', { ascending: false });

      setIntegrations(data || []);
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      setLoading(false);
    }
  }

  const slackIntegration = integrations.find(
    (i) => i.provider === 'slack' && i.status === 'active'
  );

  async function handleDisconnect() {
    if (!slackIntegration) return;
    if (!confirm('Disconnect Slack? This will stop monitoring all channels.')) return;

    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('integrations')
        .update({ status: 'revoked' })
        .eq('id', slackIntegration.id);

      if (error) throw error;
      await loadIntegrations();
      setShowChannelSelector(false);
    } catch (err) {
      console.error('Error disconnecting:', err);
      setErrorMessage('Failed to disconnect. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleBackfill() {
    setBackfilling(true);
    setBackfillMessage('');
    try {
      const res = await fetch('/api/slack/backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: backfillMonths }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Backfill failed');
      }

      setBackfillMessage(
        `Backfill started for ${data.channels} channel${data.channels !== 1 ? 's' : ''} (${backfillMonths} month${backfillMonths !== 1 ? 's' : ''}). This runs in the background.`
      );
    } catch (err) {
      setBackfillMessage(
        err instanceof Error ? err.message : 'Failed to start backfill'
      );
    } finally {
      setBackfilling(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <LoadingState />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-2xl">
          <PageHeader
            title="Integrations"
            description="Connect data sources for decision extraction"
          />

          {/* Success / Error Messages */}
          {successMessage && (
            <div className="mb-4 px-3 py-2 bg-emerald-950/30 border border-emerald-900/50 rounded-md">
              <p className="text-xs text-emerald-400">{successMessage}</p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 px-3 py-2 bg-red-950/30 border border-red-900/50 rounded-md">
              <p className="text-xs text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Connected Integrations */}
          <SectionHeader title="Connected" />

          {integrations.filter((i) => i.status === 'active').length === 0 ? (
            <Card padding="sm" className="mb-6">
              <p className="text-xs text-zinc-500">
                No integrations connected yet. Connect Slack below to start
                extracting decisions from your team conversations.
              </p>
            </Card>
          ) : (
            <div className="space-y-2 mb-6">
              {integrations
                .filter((i) => i.status === 'active')
                .map((integration) => (
                  <Card key={integration.id} padding="sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-[#4A154B] flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-white"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-zinc-200 capitalize">
                              {integration.provider}
                            </p>
                            <Badge variant="success" size="xs">
                              Active
                            </Badge>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {(integration.credentials as Record<string, string>)
                              ?.team_name || 'Workspace'}
                            {integration.connected_at &&
                              ` -- Connected ${formatRelativeTime(integration.connected_at)}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={handleDisconnect}
                        loading={disconnecting}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          )}

          {/* Connect Slack */}
          {!slackIntegration && (
            <>
              <SectionHeader title="Available" />
              <Card padding="sm" className="mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-zinc-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Slack</p>
                      <p className="text-[10px] text-zinc-500">
                        Monitor channels for decisions, extract and organize
                        automatically
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      window.location.href = '/api/slack/oauth';
                    }}
                  >
                    Connect
                  </Button>
                </div>
              </Card>
            </>
          )}

          {/* Channel Selector (when Slack is connected) */}
          {slackIntegration && (
            <>
              <SectionHeader
                title="Monitored Channels"
                description="Select which Slack channels to monitor for decisions"
                actions={
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowChannelSelector(!showChannelSelector)}
                  >
                    {showChannelSelector ? 'Hide' : 'Configure'}
                  </Button>
                }
              />

              {showChannelSelector && (
                <Card padding="sm" className="mb-6">
                  <CardContent>
                    <ChannelSelector onSaved={() => {}} />
                  </CardContent>
                </Card>
              )}

              {!showChannelSelector && (
                <Card padding="sm" className="mb-6">
                  <p className="text-xs text-zinc-500">
                    Click &quot;Configure&quot; to select which channels are
                    monitored for decision extraction.
                  </p>
                </Card>
              )}
            </>
          )}

          {/* Backfill Section (when Slack is connected) */}
          {slackIntegration && (
            <>
              <SectionHeader
                title="Historical Backfill"
                description="Import past messages and extract decisions"
              />
              <Card padding="sm" className="mb-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-zinc-400">Time range:</label>
                    <div className="flex gap-1.5">
                      {[1, 3, 6].map((m) => (
                        <button
                          key={m}
                          onClick={() => setBackfillMonths(m)}
                          className={`px-2.5 py-1 text-xs rounded-md transition-all duration-150 ${
                            backfillMonths === m
                              ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-800/50'
                              : 'bg-zinc-800/50 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                          }`}
                        >
                          {m} month{m !== 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-zinc-600">
                      This will fetch messages from monitored channels and run
                      decision extraction on threads with 3+ replies.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleBackfill}
                      loading={backfilling}
                      disabled={backfilling}
                    >
                      Start Backfill
                    </Button>
                  </div>

                  {backfillMessage && (
                    <p
                      className={`text-[10px] ${
                        backfillMessage.includes('started')
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {backfillMessage}
                    </p>
                  )}
                </div>
              </Card>
            </>
          )}

          {/* Previously disconnected integrations */}
          {integrations.filter((i) => i.status === 'revoked').length > 0 && (
            <>
              <SectionHeader title="Previously Connected" />
              <Card padding="none" className="mb-6">
                <div className="divide-y divide-zinc-800/30">
                  {integrations
                    .filter((i) => i.status === 'revoked')
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-zinc-500 capitalize">
                            {integration.provider}
                          </p>
                          <Badge variant="muted" size="xs">
                            Disconnected
                          </Badge>
                        </div>
                        <p className="text-[10px] text-zinc-600">
                          {(
                            integration.credentials as Record<string, string>
                          )?.team_name || ''}
                        </p>
                      </div>
                    ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
