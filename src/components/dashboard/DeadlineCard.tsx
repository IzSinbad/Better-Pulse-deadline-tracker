'use client'

// deadline card — colored urgency strip, countdown, hover grade impact bar
// click expands to DetailPanel, checkmark button marks it done

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { EnrichedDeadline } from '@/types/app'
import { Badge } from '@/components/ui/Badge'
import { urgencyStripClass, deadlineTypeIcon, formatDueDate } from '@/lib/utils'
import { useCountdown } from '@/hooks/useCountdown'
import { DetailPanel } from './DetailPanel'

interface DeadlineCardProps {
  deadline: EnrichedDeadline
  onCompleted?: (id: string) => void
}

export function DeadlineCard({ deadline: d, onCompleted }: DeadlineCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMarkingDone, setIsMarkingDone] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const countdown = useCountdown(d.due_at)

  const urgencyStrip = urgencyStripClass(d.urgency)

  async function handleMarkDone(e: React.MouseEvent) {
    // stop click from opening the detail panel
    e.stopPropagation()
    if (isMarkingDone) return

    setIsMarkingDone(true)
    try {
      const res = await fetch(`/api/deadlines/${d.id}/complete`, { method: 'PATCH' })
      if (res.ok) {
        setIsDone(true)
        // give it a moment so the user sees the checkmark, then remove from list
        setTimeout(() => onCompleted?.(d.id), 600)
      }
    } catch {
      // silently fail — not the end of the world
    } finally {
      setIsMarkingDone(false)
    }
  }

  if (isDone) {
    return (
      <motion.div
        initial={{ opacity: 1, height: 'auto' }}
        animate={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      />
    )
  }

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
        {/* urgency strip */}
        <div
          className={`w-1 shrink-0 ${urgencyStrip}`}
          style={{ opacity: d.urgency === 'low' ? 0.5 : 1 }}
        />

        {/* main content */}
        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none mt-0.5 shrink-0">
              {deadlineTypeIcon(d.type)}
            </span>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {d.title}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                {d.course_code && d.course_name && d.course_name !== d.course_code
                  ? `${d.course_code} · ${d.course_name}`
                  : d.course_name || d.course_code || 'Unknown Course'}
              </p>
            </div>

            {/* right side — badge + countdown + done button */}
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

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatDueDate(d.due_at)}
            </span>

            {/* mark done button — always visible, not just on hover */}
            <button
              onClick={handleMarkDone}
              disabled={isMarkingDone}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-all"
              style={{
                color: 'var(--text-muted)',
                background: isHovered ? 'var(--bg-hover)' : 'transparent',
              }}
              title="Mark as submitted / done"
            >
              {isMarkingDone ? (
                <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span>Done</span>
            </button>
          </div>

          {/* grade impact bar on hover */}
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

      {isExpanded && (
        <DetailPanel
          deadline={d}
          onClose={() => setIsExpanded(false)}
          onCompleted={(id) => { setIsDone(true); setTimeout(() => onCompleted?.(id), 600) }}
        />
      )}
    </>
  )
}
