// the loading screen shown after setup — streams live sync progress
// "Connecting to Brightspace... Fetching COMM 1085... All done! 🎉"

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface SyncEvent {
  type: 'status' | 'complete' | 'error'
  message?: string
  deadlineCount?: number
  courseCount?: number
}

export default function LoadingPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<string[]>(['Starting up...'])
  const [isDone, setIsDone] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    // kick off the Brightspace sync and stream the progress
    const controller = new AbortController()

    // try the ICS sync first (most users), fall back to OAuth sync
    fetch('/api/brightspace/sync-ical', {
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
            // parse SSE lines — each is "event: ...\ndata: ..."
            const lines = text.split('\n')
            let eventType = ''
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim()
              } else if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6)) as SyncEvent
                  if (eventType === 'status' && data.message) {
                    setMessages(prev => [...prev, data.message!])
                  } else if (eventType === 'complete') {
                    setMessages(prev => [...prev, `All done! Found ${data.deadlineCount ?? 0} deadlines across ${data.courseCount ?? 0} courses 🎉`])
                    setIsDone(true)
                    // give them a second to read the success message
                    setTimeout(() => router.push('/dashboard'), 1500)
                  } else if (eventType === 'error') {
                    setMessages(prev => [...prev, `Hmm, something went wrong: ${data.message}`])
                    setHasError(true)
                  }
                } catch {
                  // bad JSON in the stream, skip it
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
        console.error('Sync stream error:', err)
        setHasError(true)
        setMessages(prev => [...prev, 'Connection issue — try syncing from the dashboard'])
      })

    return () => controller.abort()
  }, [router])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* spinning logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            bp
          </div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isDone ? 'Ready!' : 'Setting things up...'}
          </h2>
        </div>

        {/* live status messages */}
        <div
          className="rounded-xl p-4 text-left space-y-2 font-mono text-xs border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className="flex items-start gap-2 animate-fade-in"
              style={{
                color: i === messages.length - 1
                  ? hasError ? 'var(--urgent-critical)' : 'var(--text-primary)'
                  : 'var(--text-muted)',
              }}
            >
              <span className="mt-0.5 shrink-0">
                {i === messages.length - 1 && !isDone && !hasError
                  ? '›'
                  : isDone && i === messages.length - 1
                  ? '✓'
                  : hasError && i === messages.length - 1
                  ? '✗'
                  : '✓'}
              </span>
              <span>{msg}</span>
            </div>
          ))}

          {/* blinking cursor to show it's still running */}
          {!isDone && !hasError && (
            <div style={{ color: 'var(--accent)' }} className="flex items-center gap-1">
              <span>›</span>
              <span
                className="inline-block w-1.5 h-3 rounded-sm"
                style={{
                  background: 'var(--accent)',
                  animation: 'pulse-dot 1s ease-in-out infinite',
                }}
              />
            </div>
          )}
        </div>

        {/* fallback if sync fails */}
        {hasError && (
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm underline"
            style={{ color: 'var(--accent)' }}
          >
            Go to dashboard anyway →
          </button>
        )}
      </div>
    </main>
  )
}
