'use client'

// timeline view — chronological feed of all upcoming deadlines, grouped by day
// this is the default view and probably the one students use the most

import { useMemo } from 'react'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { AnimatePresence } from 'framer-motion'
import type { EnrichedDeadline } from '@/types/app'
import { DeadlineCard } from '@/components/dashboard/DeadlineCard'
import { groupBy } from '@/lib/utils'

interface TimelineViewProps {
  deadlines: EnrichedDeadline[]
}

export function TimelineView({ deadlines }: TimelineViewProps) {
  // group by day, sort overdue to top, then ascending by date
  const grouped = useMemo(() => {
    const sorted = [...deadlines].sort((a, b) => {
      if (!a.due_at) return 1
      if (!b.due_at) return -1
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
    })

    return groupBy(sorted, d => {
      if (!d.due_at) return 'No Due Date'
      const date = new Date(d.due_at)
      if (isToday(date)) return 'Today'
      if (isTomorrow(date)) return 'Tomorrow'
      return format(date, 'EEEE, MMMM d')
    })
  }, [deadlines])

  if (deadlines.length === 0) {
    return <EmptyState />
  }

  // put Today and Tomorrow first, then everything else in order
  const dayOrder = Object.keys(grouped).sort((a, b) => {
    if (a === 'Today') return -1
    if (b === 'Today') return 1
    if (a === 'Tomorrow') return -1
    if (b === 'Tomorrow') return 1
    if (a === 'No Due Date') return 1
    if (b === 'No Due Date') return -1
    return 0 // already sorted by date in groupBy
  })

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {dayOrder.map(day => (
          <DayGroup key={day} day={day} items={grouped[day]} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function DayGroup({ day, items }: { day: string; items: EnrichedDeadline[] }) {
  const hasUrgent = items.some(i => i.urgency === 'critical' || i.urgency === 'overdue')

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3
          className="text-xs font-semibold tracking-wider uppercase"
          style={{
            color: hasUrgent ? 'var(--urgent-critical)' : 'var(--text-muted)',
          }}
        >
          {day}
        </h3>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <DeadlineCard key={item.id} deadline={item} />
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span className="text-5xl">🎉</span>
      <div>
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          You&apos;re all clear!
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          No upcoming deadlines. Enjoy it while it lasts.
        </p>
      </div>
    </div>
  )
}
