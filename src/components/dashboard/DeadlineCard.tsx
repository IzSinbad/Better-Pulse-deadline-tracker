'use client'

// the main deadline card — shows in the timeline, course, and urgent views
// colored strip on left edge based on urgency
// hover shows grade impact bar
// click expands to DetailPanel

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { EnrichedDeadline } from '@/types/app'
import { Badge } from '@/components/ui/Badge'
import { urgencyStripClass, deadlineTypeIcon, formatDueDate } from '@/lib/utils'
import { useCountdown } from '@/hooks/useCountdown'
import { DetailPanel } from './DetailPanel'

interface DeadlineCardProps {
  deadline: EnrichedDeadline
}

export function DeadlineCard({ deadline: d }: DeadlineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const countdown = useCountdown(d.due_at)

  const urgencyStrip = urgencyStripClass(d.urgency)

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="relative flex rounded-xl overflow-hidden cursor-pointer group"
        style={{
          background: isHovered ? 'var(--bg-elevated)' : 'var(--bg-surface)',
          border: '1px solid var(--border)',
          transition: 'background 0.15s ease, border-color 0.15s ease',
          borderColor: isHovered ? 'rgba(99, 102, 241, 0.2)' : 'var(--border)',
        }}
        onClick={() => setIsExpanded(true)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* urgency strip — the colored bar on the left edge */}
        <div
          className={`w-1 shrink-0 ${urgencyStrip}`}
          style={{ opacity: d.urgency === 'low' ? 0.5 : 1 }}
        />

        {/* main content */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-start gap-2">
            {/* type icon */}
            <span className="text-base leading-none mt-0.5 shrink-0">
              {deadlineTypeIcon(d.type)}
            </span>

            <div className="flex-1 min-w-0">
              {/* title + course */}
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {d.title}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {d.course_name || d.course_code}
              </p>
            </div>

            {/* right side — weight badge + countdown */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {d.weight_percent && (
                <Badge variant="weight">{d.weight_percent}%</Badge>
              )}
              <span
                className="text-xs font-medium"
                style={{
                  color: d.urgency === 'overdue' || d.urgency === 'critical'
                    ? 'var(--urgent-critical)'
                    : d.urgency === 'high'
                    ? 'var(--urgent-high)'
                    : 'var(--text-muted)',
                }}
              >
                {countdown}
              </span>
            </div>
          </div>

          {/* due date row */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatDueDate(d.due_at)}
            </span>
          </div>

          {/* grade impact bar — slides in on hover */}
          {isHovered && d.currentGrade !== null && d.weight_percent && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              className="mt-2 pt-2 border-t origin-left"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Current grade: {d.currentGrade.toFixed(1)}%
                </span>
                {d.gradeIfZero !== null && (
                  <span className="text-xs" style={{ color: 'var(--urgent-critical)' }}>
                    If you miss: {d.gradeIfZero.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${d.currentGrade}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                />
              </div>
              {d.gradeNeededForTarget !== null && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Need {d.gradeNeededForTarget}% to hit target
                </p>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* slide-in detail panel */}
      {isExpanded && (
        <DetailPanel deadline={d} onClose={() => setIsExpanded(false)} />
      )}
    </>
  )
}
