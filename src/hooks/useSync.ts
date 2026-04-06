'use client'

// hook for triggering a manual Brightspace sync from the sidebar button
// streams progress and notifies when done

import { useState, useCallback } from 'react'

interface SyncState {
  isSyncing: boolean
  progress: string
  error: string | null
  sync: () => void
}

export function useSync(onComplete?: () => void): SyncState {
  const [isSyncing, setIsSyncing] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  const sync = useCallback(() => {
    if (isSyncing) return
    setIsSyncing(true)
    setError(null)
    setProgress('Connecting to Brightspace...')

    const controller = new AbortController()

    fetch('/api/brightspace/sync', {
      method: 'POST',
      signal: controller.signal,
    })
      .then(res => {
        if (!res.body) throw new Error('No stream')
        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        function pump(): Promise<void> {
          return reader.read().then(({ done, value }) => {
            if (done) return
            const text = decoder.decode(value)
            const lines = text.split('\n')
            let eventType = ''
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim()
              } else if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6)) as { message?: string; deadlineCount?: number }
                  if (eventType === 'status' && data.message) {
                    setProgress(data.message)
                  } else if (eventType === 'complete') {
                    setProgress(`Synced ${data.deadlineCount ?? 0} deadlines`)
                    setIsSyncing(false)
                    onComplete?.()
                  } else if (eventType === 'error') {
                    setError(data.message ?? 'Sync failed')
                    setIsSyncing(false)
                  }
                } catch {
                  // skip bad JSON
                }
              }
            }
            return pump()
          })
        }

        return pump()
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError('Sync failed — check your connection')
        setIsSyncing(false)
      })

    return () => controller.abort()
  }, [isSyncing, onComplete])

  return { isSyncing, progress, error, sync }
}
