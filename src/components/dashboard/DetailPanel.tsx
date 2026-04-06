'use client'

// the full detail view that slides in when you click a deadline card
// shows everything: course, weight, grade needed, time estimate, Brightspace link

import { motion, AnimatePresence } from 'framer-motion'
import type { EnrichedDeadline } from '@/types/app'
import { Badge } from '@/components/ui/Badge'
import { deadlineTypeIcon, formatDueDate } from '@/lib/utils'
import { useCountdown } from '@/hooks/useCountdown'

interface DetailPanelProps {
  deadline: EnrichedDeadline
  onClose: () => void
}

export function DetailPanel({ deadline: d, onClose }: DetailPanelProps) {
  const countdown = useCountdown(d.due_at)

  return (
    <AnimatePresence>
      {/* backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* panel slides in from the right */}
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-auto"
        style={{ background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)' }}
      >
        {/* header */}
        <div className="sticky top-0 flex items-start gap-3 p-5 border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
          <span className="text-2xl mt-1">{deadlineTypeIcon(d.type)}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
              {d.title}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {d.course_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="p-5 space-y-5">
          {/* countdown + due date */}
          <div
            className="rounded-xl p-4 border"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: d.urgency === 'critical' || d.urgency === 'overdue'
                ? 'rgba(239, 68, 68, 0.3)'
                : 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  {formatDueDate(d.due_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Time left</p>
                <p
                  className="text-lg font-bold mt-0.5"
                  style={{
                    color: d.urgency === 'critical' || d.urgency === 'overdue'
                      ? 'var(--urgent-critical)'
                      : d.urgency === 'high'
                      ? 'var(--urgent-high)'
                      : 'var(--accent)',
                  }}
                >
                  {countdown}
                </p>
              </div>
            </div>
          </div>

          {/* weight + grade info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Worth</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {d.weight_percent ? `${d.weight_percent}%` : '—'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>of final grade</p>
            </div>

            <div className="rounded-lg p-3 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Current grade</p>
              <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                {d.currentGrade !== null ? `${d.currentGrade.toFixed(1)}%` : '—'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>in this course</p>
            </div>
          </div>

          {/* grade impact section — the useful math */}
          {(d.gradeNeededForTarget !== null || d.gradeIfZero !== null) && (
            <div className="rounded-xl p-4 border space-y-3" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Grade Impact
              </p>

              {d.gradeNeededForTarget !== null && (
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Need for target grade
                  </p>
                  <Badge variant="weight">{d.gradeNeededForTarget}%</Badge>
                </div>
              )}

              {d.gradeIfZero !== null && (
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    If you scored 0%
                  </p>
                  <span className="text-sm font-medium" style={{ color: 'var(--urgent-critical)' }}>
                    → {d.gradeIfZero.toFixed(1)}%
                  </span>
                </div>
              )}

              {d.currentGrade !== null && (
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>0%</span>
                    <span>Current: {d.currentGrade.toFixed(1)}%</span>
                    <span>100%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${d.currentGrade}%`,
                        background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* description if available */}
          {d.description && (
            <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Description
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {/* strip HTML tags if any come from Brightspace */}
                {d.description.replace(/<[^>]+>/g, '').trim().slice(0, 500)}
                {d.description.length > 500 && '...'}
              </p>
            </div>
          )}

          {/* open in Brightspace button */}
          {d.deeplink_url && (
            <a
              href={d.deeplink_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'white',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--accent-hover)')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.background = 'var(--accent)')}
            >
              Open in Brightspace
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
