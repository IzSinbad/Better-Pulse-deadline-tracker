'use client'

// calendar view — monthly grid with deadline dots on each day
// click a day to see that day's items in a slide-out

import { useState, useMemo } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay,
  addMonths, subMonths,
} from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import type { EnrichedDeadline } from '@/types/app'
import { DeadlineCard } from '@/components/dashboard/DeadlineCard'

interface CalendarViewProps {
  deadlines: EnrichedDeadline[]
}

export function CalendarView({ deadlines }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // build the calendar grid — always start on Sunday, end on Saturday
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart)
    const gridEnd = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentMonth])

  // map each day to its deadlines
  const deadlinesByDay = useMemo(() => {
    const map = new Map<string, EnrichedDeadline[]>()
    for (const d of deadlines) {
      if (!d.due_at) continue
      const key = format(new Date(d.due_at), 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(d)
    }
    return map
  }, [deadlines])

  const selectedDayItems = selectedDay
    ? (deadlinesByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [])
    : []

  return (
    <div>
      {/* month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          ←
        </button>
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          →
        </button>
      </div>

      {/* day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-xs py-2 font-medium" style={{ color: 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map(day => {
          const key = format(day, 'yyyy-MM-dd')
          const items = deadlinesByDay.get(key) ?? []
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const hasItems = items.length > 0
          const hasUrgent = items.some(i => i.urgency === 'critical' || i.urgency === 'overdue')

          return (
            <button
              key={key}
              onClick={() => {
                setSelectedDay(isSelected ? null : day)
              }}
              className="aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 gap-1 transition-all text-xs relative"
              style={{
                background: isSelected
                  ? 'rgba(99, 102, 241, 0.2)'
                  : isToday(day)
                  ? 'rgba(99, 102, 241, 0.08)'
                  : hasItems
                  ? 'var(--bg-elevated)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid rgba(99, 102, 241, 0.5)'
                  : isToday(day)
                  ? '1px solid rgba(99, 102, 241, 0.3)'
                  : '1px solid transparent',
                opacity: isCurrentMonth ? 1 : 0.3,
                cursor: hasItems ? 'pointer' : 'default',
              }}
            >
              <span
                style={{
                  color: isToday(day) ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: isToday(day) ? 700 : 400,
                }}
              >
                {format(day, 'd')}
              </span>

              {/* deadline dots */}
              {hasItems && (
                <div className="flex gap-0.5 flex-wrap justify-center px-1">
                  {items.slice(0, 3).map(item => (
                    <div
                      key={item.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: item.urgency === 'critical' || item.urgency === 'overdue'
                          ? 'var(--urgent-critical)'
                          : item.urgency === 'high'
                          ? 'var(--urgent-high)'
                          : item.urgency === 'medium'
                          ? 'var(--urgent-medium)'
                          : 'var(--urgent-low)',
                      }}
                    />
                  ))}
                  {items.length > 3 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                      +{items.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* selected day items slide-down */}
      <AnimatePresence>
        {selectedDay && selectedDayItems.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4"
          >
            <div className="border-t pt-4" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {format(selectedDay, 'EEEE, MMMM d')} — {selectedDayItems.length} item{selectedDayItems.length !== 1 ? 's' : ''}
              </h3>
              <div className="space-y-2">
                {selectedDayItems.map(item => (
                  <DeadlineCard key={item.id} deadline={item} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
