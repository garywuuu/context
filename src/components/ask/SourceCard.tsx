'use client';

import Link from 'next/link';
import { ConfidenceBadge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/utils';

export interface SourceCardProps {
  action_taken: string;
  similarity: number;
  timestamp: string;
  decision_id: string;
  source_url?: string;
}

export default function SourceCard({
  action_taken,
  similarity,
  timestamp,
  decision_id,
  source_url,
}: SourceCardProps) {
  return (
    <Link
      href={`/decisions/${decision_id}`}
      className="block border border-zinc-800/60 rounded-md p-2.5 hover:border-zinc-700/80 hover:bg-zinc-800/20 transition-all duration-150 group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-zinc-300 leading-snug line-clamp-2 flex-1 min-w-0 group-hover:text-zinc-200 transition-colors">
          {action_taken}
        </p>
        <ConfidenceBadge confidence={similarity} className="shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-[10px] text-zinc-600">
          {formatRelativeTime(timestamp)}
        </span>
        {source_url && (
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] text-cyan-500/70 hover:text-cyan-400 transition-colors"
          >
            View in Slack
          </a>
        )}
        <span className="text-[10px] text-zinc-700 ml-auto">
          <svg className="w-2.5 h-2.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
