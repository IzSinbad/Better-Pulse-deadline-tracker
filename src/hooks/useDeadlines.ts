'use client'

// custom hook that fetches and manages deadline data
// handles loading, errors, and the last-synced timestamp

import { useState, useEffect, useCallback } from 'react'
import type { EnrichedDeadline } from '@/types/app'

interface DeadlinesState {
  deadlines: EnrichedDeadline[]
  isLoading: boolean
  error: string | null
  lastSynced: string | null
  refresh: () => void
}

export function useDeadlines(): DeadlinesState {
  const [deadlines, setDeadlines] = useState<EnrichedDeadline[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<string | null>(null)

  const fetchDeadlines = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/brightspace/deadlines')
      if (!res.ok) throw new Error(`Failed to fetch deadlines: ${res.status}`)
      const data = await res.json() as { deadlines: EnrichedDeadline[]; lastSynced: string | null }
      setDeadlines(data.deadlines)
      setLastSynced(data.lastSynced)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deadlines')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeadlines()
  }, [fetchDeadlines])

  return { deadlines, isLoading, error, lastSynced, refresh: fetchDeadlines }
}
