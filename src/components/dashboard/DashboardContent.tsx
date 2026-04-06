'use client'

// the main content area of the dashboard — handles view switching and loads deadlines
// sits inside the DashboardShell, between the sidebar and assistant panel

import { useState, useMemo } from 'react'
import { useDeadlines } from '@/hooks/useDeadlines'
import { WorkloadHeatmap } from './WorkloadHeatmap'
import { TimelineView } from '@/components/views/TimelineView'
import { CalendarView } from '@/components/views/CalendarView'
import { CourseView } from '@/components/views/CourseView'
import { UrgentView } from '@/components/views/UrgentView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { URGENCY_THRESHOLDS } from '@/types/app'

type ViewType = 'timeline' | 'calendar' | 'course' | 'urgent'

const VIEWS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'timeline', label: 'Timeline', icon: '⬇️' },
  { id: 'calendar', label: 'Calendar', icon: '🗓️' },
  { id: 'course', label: 'By Course', icon: '📚' },
  { id: 'urgent', label: 'Urgent', icon: '🔴' },
]

export function DashboardContent() {
  const [activeView, setActiveView] = useState<ViewType>('timeline')
  const { deadlines, isLoading, error, lastSynced } = useDeadlines()

  // filter to only upcoming (not overdue completions)
  const upcoming = useMemo(
    () => deadlines.filter(d => !d.is_completed),
    [deadlines]
  )

  const urgentCount = useMemo(
    () => upcoming.filter(d => d.urgency === 'critical' || d.urgency === 'overdue').length,
    [upcoming]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading your deadlines...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-3xl">😬</span>
        <p className="text-sm" style={{ color: 'var(--urgent-critical)' }}>{error}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Try hitting sync in the sidebar
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* heatmap at top — always visible */}
      <WorkloadHeatmap deadlines={upcoming} />

      {/* view switcher tabs */}
      <div className="flex items-center gap-1 mb-5 border-b pb-0" style={{ borderColor: 'var(--border)' }}>
        {VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className="relative flex items-center gap-1.5 px-3 py-2 text-sm transition-colors rounded-t-lg"
            style={{
              color: activeView === view.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeView === view.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <span>{view.icon}</span>
            <span>{view.label}</span>
            {view.id === 'urgent' && urgentCount > 0 && (
              <span
                className="ml-0.5 text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--urgent-critical)', color: 'white', fontSize: '10px' }}
              >
                {urgentCount}
              </span>
            )}
          </button>
        ))}

        {/* last synced timestamp — right side */}
        {lastSynced && (
          <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
            synced {formatRelativeTime(lastSynced)}
          </span>
        )}
      </div>

      {/* the actual view */}
      {activeView === 'timeline' && <TimelineView deadlines={upcoming} />}
      {activeView === 'calendar' && <CalendarView deadlines={upcoming} />}
      {activeView === 'course' && <CourseView deadlines={upcoming} />}
      {activeView === 'urgent' && <UrgentView deadlines={upcoming} />}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
