'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, showCount, maxLength, value, className, ...props }, ref) => {
    const charCount = typeof value === 'string' ? value.length : 0;
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          maxLength={maxLength}
          className={cn(
            'w-full rounded-lg border bg-bg-secondary px-3 py-2 text-sm text-text-primary',
            'placeholder:text-text-muted resize-none',
            'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent',
            'transition-all duration-150',
            error ? 'border-error' : 'border-border-default',
            className
          )}
          {...props}
        />
        <div className="flex justify-between">
          {error && <p className="text-xs text-error">{error}</p>}
          {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
          {!error && !hint && <span />}
          {showCount && maxLength && (
            <p className="text-xs text-text-muted">
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
