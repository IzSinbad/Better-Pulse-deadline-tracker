'use client'

// the outer shell of the dashboard — three column layout
// sidebar | main content area | assistant panel
// this is a client component so we can manage view state, dark mode, etc.

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { AssistantPanel } from './AssistantPanel'

interface DashboardShellProps {
  user: {
    id: string
    email: string
    display_name: string | null
  }
  preferences: {
    dark_mode: boolean
    default_view: string
    confetti_enabled: boolean
    notification_lead_hours: number
  }
  children: React.ReactNode
}

export function DashboardShell({ user, preferences, children }: DashboardShellProps) {
  const [isDark, setIsDark] = useState(preferences.dark_mode)
  const [activeFilter, setActiveFilter] = useState<string>('all')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isAssistantOpen, setIsAssistantOpen] = useState(true)

  function toggleDarkMode() {
    setIsDark(prev => !prev)
    // save preference to server (fire and forget)
    fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dark_mode: !isDark }),
    }).catch(() => {})
  }

  return (
    <div className={isDark ? '' : 'light'} style={{ height: '100vh', overflow: 'hidden', display: 'flex' }}>
      {/* sidebar — collapsible on smaller screens */}
      <div
        style={{
          width: isSidebarOpen ? 'var(--sidebar-width)' : '0',
          overflow: 'hidden',
          transition: 'width 0.25s ease',
          flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        {isSidebarOpen && (
          <Sidebar
            user={user}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            isDark={isDark}
            onToggleDark={toggleDarkMode}
          />
        )}
      </div>

      {/* main content area */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-base)' }}>
        {/* top bar — hamburger + view toggle buttons */}
        <div
          className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b"
          style={{ background: 'var(--bg-base)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
            title="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setIsAssistantOpen(prev => !prev)}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-hover)] text-xs flex items-center gap-1.5"
            style={{ color: isAssistantOpen ? 'var(--accent)' : 'var(--text-muted)' }}
            title="Toggle study assistant"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="hidden sm:inline">Study Assistant</span>
          </button>
        </div>

        {/* the actual page content (timeline/calendar/course/urgent views) */}
        <div className="p-4">
          {children}
        </div>
      </div>

      {/* right panel — assistant chat */}
      <div
        style={{
          width: isAssistantOpen ? 'var(--panel-width)' : '0',
          overflow: 'hidden',
          transition: 'width 0.25s ease',
          flexShrink: 0,
          borderLeft: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        {isAssistantOpen && <AssistantPanel />}
      </div>
    </div>
  )
}
