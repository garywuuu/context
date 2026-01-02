import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'block w-full px-2.5 py-1.5 text-sm bg-zinc-900 border rounded-md text-zinc-100 placeholder-zinc-600',
          'focus:outline-none focus:ring-1 focus:border-transparent transition-all duration-150',
          error
            ? 'border-red-600/50 focus:ring-red-500'
            : 'border-zinc-800 focus:ring-cyan-500/50 focus:border-cyan-600/50',
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'block w-full px-2.5 py-1.5 text-sm bg-zinc-900 border rounded-md text-zinc-100 placeholder-zinc-600 resize-none',
          'focus:outline-none focus:ring-1 focus:border-transparent transition-all duration-150',
          error
            ? 'border-red-600/50 focus:ring-red-500'
            : 'border-zinc-800 focus:ring-cyan-500/50',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-xs font-medium text-zinc-400 mb-1', className)}
        {...props}
      >
        {children}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    );
  }
);

Label.displayName = 'Label';

export interface HelperTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: boolean;
}

const HelperText = forwardRef<HTMLParagraphElement, HelperTextProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn(
          'mt-1 text-[10px]',
          error ? 'text-red-400' : 'text-zinc-600',
          className
        )}
        {...props}
      />
    );
  }
);

HelperText.displayName = 'HelperText';

export { Input, Textarea, Label, HelperText };
