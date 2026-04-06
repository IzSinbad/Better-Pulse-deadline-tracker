'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useDeadlines } from '@/hooks/useDeadlines'
import { useDashboard } from './DashboardContext'
import type { ViewType } from './DashboardContext'
import { TimelineView } from '@/components/views/TimelineView'
import { CalendarView } from '@/components/views/CalendarView'
import { CourseView } from '@/components/views/CourseView'
import { UrgentView } from '@/components/views/UrgentView'
import { DoneView } from '@/components/views/DoneView'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { URGENCY_THRESHOLDS } from '@/types/app'

const AnnouncementsView = dynamic(
  () => import('@/components/views/AnnouncementsView').then(m => ({ default: m.AnnouncementsView })),
  { ssr: false, loading: () => <div className="flex items-center justify-center py-16"><div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div> }
)

// icon only on small screens, icon + label on md+
const VIEWS: { id: ViewType; label: string; icon: string }[] = [
  { id: 'timeline',      label: 'Timeline',      icon: '📋' },
  { id: 'urgent',        label: 'Urgent',         icon: '🔴' },
  { id: 'course',        label: 'By Course',      icon: '📚' },
  { id: 'calendar',      label: 'Calendar',       icon: '🗓️' },
  { id: 'announcements', label: 'Updates',        icon: '📢' },
  { id: 'done',          label: 'Done',           icon: '✅' },
]

export function DashboardContent() {
  const { activeView, setActiveView } = useDashboard()
  const { deadlines, isLoading, error, lastSynced } = useDeadlines()

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
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your deadlines...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-3xl">😬</span>
        <p className="text-sm" style={{ color: 'var(--urgent-critical)' }}>{error}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try hitting sync in the sidebar</p>
      </div>
    )
  }

  return (
    <div>
      {/* tab bar — icons only on mobile, icon+label on md+ */}
      <div
        className="flex items-center border-b mb-4"
        style={{ borderColor: 'var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}
      >
        {VIEWS.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className="relative flex items-center gap-1.5 px-2.5 py-2.5 text-sm transition-colors shrink-0"
            style={{
              color: activeView === view.id ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeView === view.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            <span className="text-base leading-none">{view.icon}</span>
            <span className="hidden md:inline text-xs">{view.label}</span>
            {view.id === 'urgent' && urgentCount > 0 && (
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--urgent-critical)', color: 'white', fontSize: '9px', fontWeight: 700 }}
              >
                {urgentCount}
              </span>
            )}
          </button>
        ))}

        {lastSynced && (
          <span className="ml-auto pl-2 text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
            {formatRelativeTime(lastSynced)}
          </span>
        )}
      </div>

      {activeView === 'timeline'      && <TimelineView deadlines={upcoming} />}
      {activeView === 'calendar'      && <CalendarView deadlines={upcoming} />}
      {activeView === 'course'        && <CourseView deadlines={upcoming} />}
      {activeView === 'urgent'        && <UrgentView deadlines={upcoming} />}
      {activeView === 'announcements' && <AnnouncementsView />}
      {activeView === 'done'          && <DoneView />}
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
