'use client'

// the 14-day heatmap strip at the top of the dashboard
// shows how packed each day is — darker = more/heavier items due
// hover a day to see what's due

import { useState, useMemo } from 'react'
import { format, addDays, startOfDay } from 'date-fns'
import type { EnrichedDeadline, HeatmapDay } from '@/types/app'
import { deadlineTypeIcon, formatDueDate } from '@/lib/utils'

interface WorkloadHeatmapProps {
  deadlines: EnrichedDeadline[]
}

export function WorkloadHeatmap({ deadlines }: WorkloadHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  const days = useMemo<HeatmapDay[]>(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')

      // find deadlines due on this day
      const items = deadlines.filter(d => {
        if (!d.due_at) return false
        return format(new Date(d.due_at), 'yyyy-MM-dd') === dateStr
      })

      // intensity score: base = number of items, boosted by weight
      let score = 0
      for (const item of items) {
        score += 1
        if ((item.weight_percent ?? 0) > 15) score += 1
        if (item.urgency === 'critical' || item.urgency === 'overdue') score += 1
      }

      const intensity = score === 0 ? 0 : score <= 1 ? 1 : score <= 3 ? 2 : score <= 5 ? 3 : 4

      return { date, items, intensity: intensity as 0 | 1 | 2 | 3 | 4 }
    })
  }, [deadlines])

  const intensityColors = [
    'transparent',                    // 0 — empty
    'rgba(99, 102, 241, 0.25)',       // 1 — light
    'rgba(99, 102, 241, 0.45)',       // 2 — medium
    'rgba(239, 68, 68, 0.45)',        // 3 — heavy
    'rgba(239, 68, 68, 0.75)',        // 4 — packed
  ]

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          NEXT 14 DAYS
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>light</span>
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ background: intensityColors[i] }}
            />
          ))}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>packed</span>
        </div>
      </div>

      <div className="relative flex gap-1">
        {days.map((day, i) => {
          const isToday = i === 0
          const isHovered = hoveredDay === i

          return (
            <div key={i} className="relative flex-1 group">
              <button
                className="w-full rounded-md transition-all duration-150"
                style={{
                  height: '48px',
                  background: day.intensity === 0
                    ? 'var(--bg-elevated)'
                    : intensityColors[day.intensity],
                  border: isToday
                    ? '1px solid rgba(99, 102, 241, 0.5)'
                    : isHovered
                    ? '1px solid rgba(255,255,255,0.15)'
                    : '1px solid transparent',
                  transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                }}
                onMouseEnter={() => setHoveredDay(i)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <span className="text-xs font-medium" style={{ color: isToday ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {format(day.date, 'EEE')}
                  </span>
                  <span className="text-xs" style={{ color: isToday ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {format(day.date, 'd')}
                  </span>
                  {day.items.length > 0 && (
                    <span className="text-xs font-bold" style={{ color: 'white' }}>
                      {day.items.length}
                    </span>
                  )}
                </div>
              </button>

              {/* tooltip — shows what's due this day */}
              {isHovered && day.items.length > 0 && (
                <div
                  className="absolute z-50 top-full mt-2 rounded-lg p-3 shadow-xl w-56 animate-fade-in"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    left: i < 7 ? '0' : 'auto',
                    right: i >= 7 ? '0' : 'auto',
                  }}
                >
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    {format(day.date, 'EEEE, MMM d')}
                  </p>
                  <div className="space-y-1.5">
                    {day.items.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-start gap-1.5 text-xs">
                        <span>{deadlineTypeIcon(item.type)}</span>
                        <div className="min-w-0">
                          <p className="truncate" style={{ color: 'var(--text-primary)' }}>
                            {item.title}
                          </p>
                          <p style={{ color: 'var(--text-muted)' }}>
                            {item.course_code}{item.weight_percent ? ` · ${item.weight_percent}%` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                    {day.items.length > 5 && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        +{day.items.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
