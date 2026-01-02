import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted';
  size?: 'xs' | 'sm';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'xs', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded';

    const variants = {
      default: 'bg-zinc-800 text-zinc-400',
      success: 'bg-emerald-950/50 text-emerald-400',
      warning: 'bg-amber-950/50 text-amber-400',
      error: 'bg-red-950/50 text-red-400',
      info: 'bg-cyan-950/50 text-cyan-400',
      muted: 'bg-zinc-800/50 text-zinc-500',
    };

    const sizes = {
      xs: 'px-1.5 py-0.5 text-[10px]',
      sm: 'px-2 py-0.5 text-xs',
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export interface ConfidenceBadgeProps extends Omit<BadgeProps, 'variant'> {
  confidence: number;
  showLabel?: boolean;
}

const ConfidenceBadge = forwardRef<HTMLSpanElement, ConfidenceBadgeProps>(
  ({ confidence, showLabel = false, className, ...props }, ref) => {
    const getVariant = (): BadgeProps['variant'] => {
      if (confidence >= 0.8) return 'success';
      if (confidence >= 0.5) return 'warning';
      return 'error';
    };

    const getLabel = () => {
      if (confidence >= 0.8) return 'High';
      if (confidence >= 0.5) return 'Med';
      return 'Low';
    };

    return (
      <Badge ref={ref} variant={getVariant()} className={className} {...props}>
        {Math.round(confidence * 100)}%{showLabel && ` ${getLabel()}`}
      </Badge>
    );
  }
);

ConfidenceBadge.displayName = 'ConfidenceBadge';

export { Badge, ConfidenceBadge };
