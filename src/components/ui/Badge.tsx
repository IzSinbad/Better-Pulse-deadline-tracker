import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'weight' | 'type' | 'urgency'
  urgency?: string
  className?: string
}

export function Badge({ children, variant = 'default', urgency, className }: BadgeProps) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium'

  const variantStyles = {
    default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
    weight: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20',
    type: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]',
    urgency: cn(
      urgency === 'critical' || urgency === 'overdue'
        ? 'bg-red-500/15 text-red-400 border border-red-500/20'
        : urgency === 'high'
        ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
        : urgency === 'medium'
        ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
        : 'bg-green-500/15 text-green-400 border border-green-500/20'
    ),
  }

  return (
    <span className={cn(base, variantStyles[variant], className)}>
      {children}
    </span>
  )
}
