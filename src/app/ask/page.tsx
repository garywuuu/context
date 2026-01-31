'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import ChatMessage, { type ChatMessageSource } from '@/components/ask/ChatMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatMessageSource[];
}

const EXAMPLE_QUESTIONS = [
  'Why did we defer mobile?',
  'What do we know about pricing?',
  'What has the eng team decided this month?',
];

export default function AskPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(async (question?: string) => {
    const q = (question || input).trim();
    if (!q || loading) return;

    setError(null);
    setInput('');

    // Add user message
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: q,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get a response';
      setError(errorMessage);

      const errorMsg: Message = {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong: ${errorMessage}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleExampleClick = useCallback((question: string) => {
    handleSubmit(question);
  }, [handleSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="p-6 pb-0">
          <PageHeader
            title="Ask"
            description="Ask questions about your organization's decisions"
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <div className="max-w-3xl mx-auto">
            {isEmpty ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-zinc-400 mb-1">
                  Ask about your decisions
                </h3>
                <p className="text-xs text-zinc-600 text-center max-w-sm mb-6">
                  Query your organization&apos;s decision history using natural language.
                  Answers are generated from your logged decisions.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  {EXAMPLE_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleExampleClick(q)}
                      className="px-3 py-2 text-xs text-zinc-400 bg-zinc-900/50 border border-zinc-800/60 rounded-lg hover:border-zinc-700/80 hover:text-zinc-300 hover:bg-zinc-800/30 transition-all duration-150 text-left"
                    >
                      &ldquo;{q}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message list */
              <div className="space-y-4 py-4">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    sources={msg.sources}
                  />
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-zinc-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs text-zinc-500">Searching decisions and generating answer...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && !loading && (
          <div className="px-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-red-950/30 border border-red-800/40 rounded-md px-3 py-2 mb-2">
                <p className="text-[11px] text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="border-t border-zinc-800/50 bg-[#0a0a0b] px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about your decisions..."
                  disabled={loading}
                  className="block w-full px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-600/50 transition-all duration-150 disabled:opacity-50"
                />
              </div>
              <Button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loading}
                loading={loading}
                size="md"
              >
                {loading ? null : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </Button>
            </div>
            <p className="text-[10px] text-zinc-700 mt-1.5 px-1">
              Answers are generated from your logged decisions using RAG. Results may not be exhaustive.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
