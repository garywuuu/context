import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {icon && (
        <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center mb-3">
          <div className="text-zinc-600">{icon}</div>
        </div>
      )}
      <h3 className="text-sm font-medium text-zinc-400 mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-zinc-600 text-center max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-12', className)}>
      <svg className="animate-spin h-5 w-5 text-zinc-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-3 animate-pulse', className)}>
      <div className="h-3 w-2/3 bg-zinc-800 rounded mb-2" />
      <div className="h-3 w-1/3 bg-zinc-800 rounded" />
    </div>
  );
}

export function ListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
