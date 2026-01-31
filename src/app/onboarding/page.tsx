'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, HelperText } from '@/components/ui/Input';

type Step = 'welcome' | 'llm' | 'slack' | 'done';

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [orgId, setOrgId] = useState('');
  const [hasSlack, setHasSlack] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkState() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!userData) return;
      setOrgId(userData.organization_id);

      const { data: org } = await supabase
        .from('organizations')
        .select('llm_provider, llm_config')
        .eq('id', userData.organization_id)
        .single();

      // Check if Slack is already connected
      const { data: integrations } = await supabase
        .from('integrations')
        .select('id, provider, status')
        .eq('organization_id', userData.organization_id)
        .eq('provider', 'slack')
        .eq('status', 'active');

      const slackConnected = integrations && integrations.length > 0;
      setHasSlack(!!slackConnected);

      const llmConfig = org?.llm_config as Record<string, string> | null;
      const hasLLM = llmConfig && llmConfig.api_key;

      if (hasLLM && slackConnected) {
        setStep('done');
      } else if (hasLLM) {
        setStep('slack');
      }
    }
    checkState();
  }, [supabase, router]);

  async function validateAndSaveKey() {
    setValidating(true);
    setError('');

    try {
      // Validate the API key with a test call
      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!res.ok) throw new Error('Invalid OpenAI API key');
      } else {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        });
        if (!res.ok && res.status === 401) throw new Error('Invalid Anthropic API key');
      }

      // Save to org
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          llm_provider: provider,
          llm_config: { api_key: apiKey },
        })
        .eq('id', orgId);

      if (updateError) throw updateError;

      setStep('slack');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key');
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-4">
      <Card className="max-w-md w-full" padding="md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-8 h-8 rounded-md bg-cyan-600 flex items-center justify-center mb-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-zinc-100">Intelligent Context</h1>
        </div>

        {/* Step 1: Welcome */}
        {step === 'welcome' && (
          <div className="text-center space-y-4">
            <h2 className="text-base font-medium text-zinc-100">Welcome</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Intelligent Context captures decisions from your team&apos;s conversations so you can search, review, and learn from them.
            </p>
            <div className="space-y-2 text-left">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-cyan-950/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-cyan-400 font-medium">1</span>
                </div>
                <p className="text-xs text-zinc-400">Connect your LLM provider for decision extraction</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-cyan-950/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-cyan-400 font-medium">2</span>
                </div>
                <p className="text-xs text-zinc-400">Connect Slack to start capturing decisions</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-cyan-950/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-cyan-400 font-medium">3</span>
                </div>
                <p className="text-xs text-zinc-400">Review and confirm extracted decisions</p>
              </div>
            </div>
            <Button onClick={() => setStep('llm')} className="w-full" size="md">
              Get started
            </Button>
          </div>
        )}

        {/* Step 2: LLM Provider */}
        {step === 'llm' && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-base font-medium text-zinc-100">LLM Provider</h2>
              <p className="text-xs text-zinc-500 mt-1">Choose which LLM to use for decision extraction and queries.</p>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-3 py-2 rounded text-xs">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setProvider('openai')}
                className={`p-3 rounded-md border text-left transition-all ${
                  provider === 'openai'
                    ? 'border-cyan-600/50 bg-cyan-950/20'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <p className="text-xs font-medium text-zinc-200">OpenAI</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">GPT-4o, GPT-4o-mini</p>
              </button>
              <button
                onClick={() => setProvider('anthropic')}
                className={`p-3 rounded-md border text-left transition-all ${
                  provider === 'anthropic'
                    ? 'border-cyan-600/50 bg-cyan-950/20'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <p className="text-xs font-medium text-zinc-200">Anthropic</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Claude Sonnet, Haiku</p>
              </button>
            </div>

            <div>
              <Label htmlFor="api-key" required>API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              />
              <HelperText>
                {provider === 'openai'
                  ? 'Get your key at platform.openai.com/api-keys'
                  : 'Get your key at console.anthropic.com/settings/keys'}
              </HelperText>
            </div>

            <Button
              onClick={validateAndSaveKey}
              disabled={!apiKey || validating}
              loading={validating}
              className="w-full"
              size="md"
            >
              Validate & continue
            </Button>
          </div>
        )}

        {/* Step 3: Connect Slack */}
        {step === 'slack' && (
          <div className="text-center space-y-4">
            <h2 className="text-base font-medium text-zinc-100">Connect Slack</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Connect your Slack workspace to automatically capture decisions from conversations.
            </p>

            <div className="p-4 rounded-md border border-zinc-800 bg-zinc-900/50">
              <svg className="w-8 h-8 mx-auto mb-2 text-zinc-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.522h-6.313z"/>
              </svg>
              <p className="text-xs text-zinc-400">
                We&apos;ll request access to read channel messages and post responses.
              </p>
            </div>

            <div className="space-y-2">
              <a href="/api/slack/oauth">
                <Button className="w-full" size="md">
                  Connect Slack
                </Button>
              </a>
              <Button
                variant="ghost"
                onClick={() => setStep('done')}
                className="w-full"
                size="md"
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-10 h-10 rounded-full bg-emerald-950/50 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-medium text-zinc-100">You&apos;re all set</h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {hasSlack
                ? 'Slack is connected. Decisions will be automatically extracted and queued for your review.'
                : 'You can connect Slack later from the Integrations settings page.'}
            </p>
            <Button
              onClick={() => router.push('/review')}
              className="w-full"
              size="md"
            >
              Go to Review
            </Button>
          </div>
        )}

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mt-6">
          {(['welcome', 'llm', 'slack', 'done'] as Step[]).map((s) => (
            <div
              key={s}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                s === step ? 'bg-cyan-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
