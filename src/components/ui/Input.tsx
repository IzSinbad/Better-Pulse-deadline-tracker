import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2.5 rounded-lg text-sm',
          'bg-[var(--bg-elevated)] border border-[var(--border)]',
          'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
          'focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30',
          'transition-colors duration-150',
          error && 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {hint && !error && (
        <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
