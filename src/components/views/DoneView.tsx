'use client'

// shows completed deadlines with an undo button
// items stay here until manually undone or a new sync replaces them

import { useState, useEffect, useCallback } from 'react'
import type { EnrichedDeadline } from '@/types/app'
import { deadlineTypeIcon, formatDueDate } from '@/lib/utils'

export function DoneView() {
  const [items, setItems] = useState<EnrichedDeadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [undoing, setUndoing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/brightspace/deadlines?completed=true')
      const data = await res.json()
      setItems(data.deadlines ?? [])
    } catch {
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUndo(id: string) {
    setUndoing(id)
    try {
      const res = await fetch(`/api/deadlines/${id}/complete?undo=true`, { method: 'PATCH' })
      if (res.ok) {
        setItems(prev => prev.filter(i => i.id !== id))
      }
    } finally {
      setUndoing(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <span className="text-3xl">✅</span>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Nothing marked done yet</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Hit the checkmark on any deadline to mark it done
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {items.length} item{items.length !== 1 ? 's' : ''} completed — tap Undo to move back
      </p>
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border)',
            opacity: 0.7,
          }}
        >
          <span className="text-base shrink-0">{deadlineTypeIcon(item.type)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate line-through" style={{ color: 'var(--text-secondary)' }}>
              {item.title}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
              {item.course_code ?? item.course_name ?? 'Unknown'} · {formatDueDate(item.due_at)}
            </p>
          </div>
          <button
            onClick={() => handleUndo(item.id)}
            disabled={undoing === item.id}
            className="shrink-0 text-xs px-2.5 py-1 rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              background: 'var(--bg-elevated)',
            }}
          >
            {undoing === item.id ? '...' : 'Undo'}
          </button>
        </div>
      ))}
    </div>
  )
}
