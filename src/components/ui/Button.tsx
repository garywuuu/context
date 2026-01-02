import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'sm', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-cyan-600 text-white hover:bg-cyan-500 focus:ring-cyan-500',
      secondary: 'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-750 hover:border-zinc-600 focus:ring-zinc-500',
      ghost: 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 focus:ring-zinc-500',
      danger: 'bg-red-600/80 text-white hover:bg-red-500 focus:ring-red-500',
    };

    const sizes = {
      xs: 'px-2 py-1 text-xs rounded',
      sm: 'px-2.5 py-1.5 text-xs rounded-md',
      md: 'px-3 py-1.5 text-sm rounded-md',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs">Loading...</span>
          </>
        ) : children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
