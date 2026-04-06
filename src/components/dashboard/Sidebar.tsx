'use client'

// sidebar — user info, course list, quick filters, sync button, settings
// this is the nav hub of the whole app

import { useState, useEffect } from 'react'
import { useSync } from '@/hooks/useSync'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: {
    id: string
    email: string
    display_name: string | null
  }
  activeFilter: string
  onFilterChange: (filter: string) => void
  isDark: boolean
  onToggleDark: () => void
}

const QUICK_FILTERS = [
  { id: 'all', label: 'All Upcoming', icon: '📋' },
  { id: 'week', label: 'This Week', icon: '📅' },
  { id: 'next7', label: 'Next 7 Days', icon: '🗓️' },
  { id: 'urgent', label: 'Urgent (< 72h)', icon: '🔴' },
]

export function Sidebar({ user, activeFilter, onFilterChange, isDark, onToggleDark }: SidebarProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [notifState, setNotifState] = useState<'unknown' | 'subscribed' | 'denied' | 'loading'>('unknown')
  const { isSyncing, progress, error, sync } = useSync(() => {
    window.location.reload()
  })

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    if (Notification.permission === 'denied') { setNotifState('denied'); return }
    // check if already subscribed
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setNotifState(sub ? 'subscribed' : 'unknown')
      })
    }).catch(() => {})
  }, [])

  async function handleNotifToggle() {
    if (notifState === 'subscribed') {
      // unsubscribe
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setNotifState('unknown')
      return
    }

    setNotifState('loading')
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') { setNotifState('denied'); return }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) { setNotifState('unknown'); return }

    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as string,
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
    setNotifState('subscribed')
  }

  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  // get initials for avatar
  const initials = (user.display_name || user.email)
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className="flex flex-col h-full"
      style={{ color: 'var(--text-primary)' }}
    >
      {/* user profile area */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {user.display_name || user.email}
            </p>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {user.email}
            </p>
          </div>
        </div>
      </div>

      {/* quick filters */}
      <div className="flex-1 overflow-auto p-3">
        <p className="text-xs font-medium mb-2 px-2" style={{ color: 'var(--text-muted)' }}>
          QUICK FILTERS
        </p>
        <nav className="space-y-0.5">
          {QUICK_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                activeFilter === filter.id
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
              )}
            >
              <span className="text-base leading-none">{filter.icon}</span>
              <span>{filter.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-4">
          <p className="text-xs font-medium mb-2 px-2" style={{ color: 'var(--text-muted)' }}>
            VIEWS
          </p>
          <nav className="space-y-0.5">
            {[
              { id: 'timeline', label: 'Timeline', icon: '⬇️' },
              { id: 'calendar', label: 'Calendar', icon: '🗓️' },
              { id: 'course', label: 'By Course', icon: '📚' },
            ].map(view => (
              <button
                key={view.id}
                onClick={() => onFilterChange(view.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                  activeFilter === view.id
                    ? 'bg-indigo-500/15 text-indigo-300'
                    : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                )}
              >
                <span className="text-base leading-none">{view.icon}</span>
                <span>{view.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* bottom actions — sync, dark mode, logout */}
      <div className="p-3 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
        {/* sync button */}
        <button
          onClick={sync}
          disabled={isSyncing}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className={cn('text-base', isSyncing && 'animate-spin')}>🔄</span>
          <span className="flex-1 text-left">
            {isSyncing ? progress || 'Syncing...' : 'Sync with Brightspace'}
          </span>
        </button>
        {error && (
          <p className="text-xs px-3" style={{ color: 'var(--urgent-critical)' }}>
            {error}
          </p>
        )}

        {/* notifications toggle */}
        {'Notification' in (typeof window !== 'undefined' ? window : {}) && notifState !== 'denied' && (
          <button
            onClick={handleNotifToggle}
            disabled={notifState === 'loading'}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
            style={{ color: notifState === 'subscribed' ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            <span className="text-base">{notifState === 'subscribed' ? '🔔' : '🔕'}</span>
            <span>
              {notifState === 'loading' ? 'Enabling...' : notifState === 'subscribed' ? 'Notifications on' : 'Enable notifications'}
            </span>
          </button>
        )}

        {/* dark mode toggle */}
        <button
          onClick={onToggleDark}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>

        {/* logout */}
        {showLogoutConfirm ? (
          <div className="flex gap-2 px-3 py-2">
            <button
              onClick={handleLogout}
              className="flex-1 text-xs rounded-md py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            >
              Yes, log out
            </button>
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 text-xs rounded-md py-1 hover:bg-[var(--bg-hover)] transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-[var(--bg-hover)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <span className="text-base">🚪</span>
            <span>Log out</span>
          </button>
        )}
      </div>
    </div>
  )
}
