'use client'

// course view — deadlines grouped by course in collapsible sections
// each section header shows the course color, name, and current grade

import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { EnrichedDeadline } from '@/types/app'
import { DeadlineCard } from '@/components/dashboard/DeadlineCard'
import { groupBy } from '@/lib/utils'

interface CourseViewProps {
  deadlines: EnrichedDeadline[]
}

// consistent colors per course — cycle through these
const COURSE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
]

export function CourseView({ deadlines }: CourseViewProps) {
  const grouped = useMemo(
    () => groupBy(deadlines, d => d.course_code ?? 'No Course'),
    [deadlines]
  )

  const courses = Object.keys(grouped).sort()

  if (deadlines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="text-5xl">📚</span>
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          No upcoming deadlines across any course
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {courses.map((courseCode, i) => (
        <CourseSection
          key={courseCode}
          courseCode={courseCode}
          items={grouped[courseCode]}
          color={COURSE_COLORS[i % COURSE_COLORS.length]}
        />
      ))}
    </div>
  )
}

function CourseSection({
  courseCode,
  items,
  color,
}: {
  courseCode: string
  items: EnrichedDeadline[]
  color: string
}) {
  const [isOpen, setIsOpen] = useState(true)

  const courseName = items[0]?.course_name ?? courseCode
  const currentGrade = items[0]?.currentGrade
  const urgentCount = items.filter(i => i.urgency === 'critical' || i.urgency === 'overdue').length

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      {/* course header — click to collapse/expand */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-hover)]"
        style={{ background: 'var(--bg-surface)' }}
      >
        {/* colored dot */}
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />

        <div className="flex-1 text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {courseCode}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {courseName !== courseCode ? courseName : ''}
          </p>
        </div>

        {/* grade + count */}
        <div className="flex items-center gap-3 shrink-0">
          {currentGrade !== null && currentGrade !== undefined && (
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {currentGrade.toFixed(1)}%
            </span>
          )}
          {urgentCount > 0 && (
            <span
              className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--urgent-critical)', color: 'white', fontSize: '10px' }}
            >
              {urgentCount}
            </span>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {items.length}
          </span>

          {/* chevron */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              color: 'var(--text-muted)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {/* collapsible items list */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="pt-2">
                {items.map(item => (
                  <div key={item.id} className="mb-2">
                    <DeadlineCard deadline={item} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
