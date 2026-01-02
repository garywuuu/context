'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, HelperText } from '@/components/ui/Input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              company_name: companyName,
            },
          },
        });

        if (error) throw error;

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setError('An account with this email already exists.');
        } else if (data.user && !data.session) {
          setMessage('Check your email for a confirmation link.');
        } else if (data.session) {
          router.push('/');
          router.refresh();
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          router.push('/');
          router.refresh();
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0b] p-4">
      <Card className="max-w-sm w-full" padding="md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-8 h-8 rounded-md bg-cyan-600 flex items-center justify-center mb-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-zinc-100">Intelligent Context</h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {isSignUp ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-3 py-2 rounded text-xs">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 px-3 py-2 rounded text-xs text-center">
              <p>{message}</p>
              <p className="text-emerald-500/70 mt-1">Return here to sign in after confirming.</p>
            </div>
          )}

          {!message && (
            <div className="space-y-3">
              {isSignUp && (
                <div>
                  <Label htmlFor="company" required>Company</Label>
                  <Input
                    id="company"
                    type="text"
                    required={isSignUp}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Inc"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" required>Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <Label htmlFor="password" required>Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                />
                {isSignUp && (
                  <HelperText>Min 6 characters</HelperText>
                )}
              </div>
            </div>
          )}

          {!message && (
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              className="w-full"
              size="md"
            >
              {isSignUp ? 'Create account' : 'Sign in'}
            </Button>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
                setMessage('');
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {message
                ? 'Back to sign in'
                : isSignUp
                  ? 'Have an account? Sign in'
                  : 'Need an account? Sign up'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
