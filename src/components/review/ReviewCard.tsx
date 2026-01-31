'use client';

import { Card } from '@/components/ui/Card';
import { Badge, ConfidenceBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';
import type { ExtractedDecision } from '@/types/v1';

export interface ReviewCardProps {
  item: ExtractedDecision;
  onConfirm: () => void;
  onEdit: () => void;
  onDismiss: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function ReviewCard({
  item,
  onConfirm,
  onEdit,
  onDismiss,
  expanded,
  onToggleExpand,
}: ReviewCardProps) {
  return (
    <Card variant={expanded ? 'highlighted' : 'interactive'} padding="none">
      {/* Header — always visible */}
      <button
        onClick={onToggleExpand}
        className="w-full text-left p-3"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 leading-snug">
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {item.source_channel && (
                <Badge variant="info" size="xs">
                  Slack #{item.source_channel}
                </Badge>
              )}
              {!item.source_channel && item.source_type && (
                <Badge variant="info" size="xs">
                  {item.source_type}
                </Badge>
              )}
              <span className="text-[10px] text-zinc-600">
                {formatRelativeTime(item.extracted_at)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {item.participants.slice(0, 4).map((participant) => (
                <Badge key={participant} variant="muted" size="xs">
                  {participant}
                </Badge>
              ))}
              {item.participants.length > 4 && (
                <span className="text-[10px] text-zinc-600">
                  +{item.participants.length - 4} more
                </span>
              )}
            </div>
            {/* Truncated rationale */}
            {item.rationale && !expanded && (
              <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                {item.rationale}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ConfidenceBadge confidence={item.confidence} showLabel />
            <svg
              className={`w-3.5 h-3.5 text-zinc-600 transition-transform duration-150 ${
                expanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-800/50 p-4">
          {/* Full rationale */}
          {item.rationale && (
            <div className="mb-4">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1">
                Rationale
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {item.rationale}
              </p>
            </div>
          )}

          {/* Alternatives table */}
          {item.alternatives && item.alternatives.length > 0 && (
            <div className="mb-4">
              <h4 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
                Alternatives Considered
              </h4>
              <div className="border border-zinc-800/60 rounded-md overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800/60">
                      <th className="text-left text-[10px] font-medium text-zinc-500 px-3 py-1.5">
                        Option
                      </th>
                      <th className="text-left text-[10px] font-medium text-zinc-500 px-3 py-1.5">
                        Reason Rejected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.alternatives.map((alt, idx) => (
                      <tr
                        key={idx}
                        className={
                          idx < item.alternatives.length - 1
                            ? 'border-b border-zinc-800/40'
                            : ''
                        }
                      >
                        <td className="text-xs text-zinc-300 px-3 py-1.5">
                          {alt.option}
                        </td>
                        <td className="text-xs text-zinc-500 px-3 py-1.5">
                          {alt.reason_rejected || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Source link */}
          {item.source_url && (
            <div className="mb-4">
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-500 hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
              >
                View source
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          )}

          {/* Source timestamp */}
          {item.source_timestamp && (
            <div className="mb-4">
              <span className="text-[10px] text-zinc-600">
                Original message: {formatRelativeTime(item.source_timestamp)}
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/40">
            <Button variant="primary" size="sm" onClick={onConfirm}>
              Confirm
            </Button>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
