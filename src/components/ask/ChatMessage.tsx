'use client';

import SourceCard from './SourceCard';

export interface ChatMessageSource {
  decision_id: string;
  action_taken: string;
  similarity: number;
  timestamp: string;
  source_url?: string;
}

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatMessageSource[];
}

export default function ChatMessage({ role, content, sources }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-cyan-600/20 border border-cyan-700/30 rounded-lg px-3.5 py-2.5">
          <p className="text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2.5">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg px-3.5 py-2.5">
          <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        {sources && sources.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide font-medium px-1">
              Sources ({sources.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {sources.map((source) => (
                <SourceCard
                  key={source.decision_id}
                  decision_id={source.decision_id}
                  action_taken={source.action_taken}
                  similarity={source.similarity}
                  timestamp={source.timestamp}
                  source_url={source.source_url}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
