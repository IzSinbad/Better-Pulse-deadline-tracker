'use client'

// urgent view — only items due within 72 hours, sorted by weight (heaviest first)
// this is the "oh crap" view

import { useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { EnrichedDeadline } from '@/types/app'
import { DeadlineCard } from '@/components/dashboard/DeadlineCard'

interface UrgentViewProps {
  deadlines: EnrichedDeadline[]
}

export function UrgentView({ deadlines }: UrgentViewProps) {
  const urgentItems = useMemo(
    () =>
      deadlines
        .filter(d => d.urgency === 'critical' || d.urgency === 'overdue' || d.urgency === 'high')
        .sort((a, b) => (b.weight_percent ?? 0) - (a.weight_percent ?? 0)),
    [deadlines]
  )

  if (urgentItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="text-5xl">🟢</span>
        <div>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            No urgent deadlines!
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Nothing due in the next 72 hours. Keep it up!
          </p>
        </div>
      </div>
    )
  }

  const totalWeight = urgentItems.reduce((sum, d) => sum + (d.weight_percent ?? 0), 0)

  return (
    <div>
      {/* summary banner */}
      <div
        className="rounded-xl p-4 mb-5 border"
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          borderColor: 'rgba(239, 68, 68, 0.2)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {urgentItems.length} item{urgentItems.length !== 1 ? 's' : ''} due within 72 hours
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {totalWeight > 0 ? `${totalWeight}% of grades on the line — sorted heaviest first` : 'Sorted by due date'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {urgentItems.map(item => (
            <DeadlineCard key={item.id} deadline={item} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
