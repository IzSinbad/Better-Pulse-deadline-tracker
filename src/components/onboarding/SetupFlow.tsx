'use client'

// setup flow — paste your Brightspace calendar feed URL
// no OAuth, no API keys, no registration — just a URL from your Brightspace calendar settings
// works from anywhere, no VPN needed

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface SetupFlowProps {
  displayName: string
  error?: string | null
}

export function SetupFlow({ displayName, error: urlError }: SetupFlowProps) {
  const router = useRouter()
  const [feedUrl, setFeedUrl] = useState('')
  const [urlErr, setUrlErr] = useState(urlError ?? '')
  const [isValidating, setIsValidating] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const firstName = displayName !== 'there' ? displayName.split(' ')[0] : 'there'

  async function handleSubmit() {
    if (!feedUrl.trim()) {
      setUrlErr('Paste the calendar URL here first')
      return
    }
    if (!feedUrl.startsWith('http')) {
      setUrlErr("That doesn't look right — the URL should start with https://")
      return
    }

    setIsValidating(true)
    setUrlErr('')

    try {
      const res = await fetch('/api/setup-ical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: feedUrl.trim() }),
      })

      const data = await res.json() as { error?: string }

      if (!res.ok) {
        setUrlErr(data.error ?? 'Something went wrong — try again')
        return
      }

      // URL is valid and saved, kick off the sync
      router.push('/dashboard/loading')
    } catch {
      setUrlErr('Connection issue — check your internet and try again')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99, 102, 241, 0.1), transparent)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-12 h-12 rounded-xl items-center justify-center text-lg font-bold mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            bp
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Hey {firstName}! One last step.
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Connect your Brightspace calendar to pull in all your deadlines.
          </p>
        </div>

        {/* main card */}
        <div
          className="rounded-2xl p-6 border space-y-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {/* step by step instructions toggle */}
          <div>
            <button
              onClick={() => setShowInstructions(prev => !prev)}
              className="flex items-center gap-2 text-sm font-medium w-full text-left"
              style={{ color: 'var(--accent)' }}
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2"
                style={{ transform: showInstructions ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              How to get your Brightspace calendar URL
            </button>

            {showInstructions && (
              <div
                className="mt-3 rounded-lg p-4 text-sm space-y-2 border"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                <ol className="list-decimal list-inside space-y-2 pl-1">
                  <li>
                    Go to{' '}
                    <a
                      href="https://conestoga.desire2learn.com/d2l/home"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--accent)' }}
                    >
                      conestoga.desire2learn.com
                    </a>{' '}
                    and log in
                  </li>
                  <li>
                    Click the <strong>grid icon</strong> (top-right, the 3×3 dots) → click <strong>Calendar</strong>
                  </li>
                  <li>
                    In the Calendar page, look for a <strong>Subscribe</strong> button or link
                    (usually top-right of the calendar)
                  </li>
                  <li>
                    Click it — you&apos;ll see a URL starting with <code className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--bg-hover)' }}>https://conestoga.desire2learn.com/d2l/le/calendar...</code>
                  </li>
                  <li>Copy the whole URL and paste it below</li>
                </ol>
                <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                  Can&apos;t find Subscribe? Try going directly to:{' '}
                  <code className="text-xs">conestoga.desire2learn.com/d2l/le/calendar/feed/subscribe</code>
                </p>
              </div>
            )}
          </div>

          {/* URL input */}
          <Input
            label="Your Brightspace Calendar Feed URL"
            placeholder="https://conestoga.desire2learn.com/d2l/le/calendar/..."
            value={feedUrl}
            onChange={e => setFeedUrl(e.target.value)}
            error={urlErr}
            autoComplete="off"
          />

          {/* what this unlocks */}
          <div className="space-y-2">
            {[
              '✅ All assignment, quiz, and exam due dates across every course',
              '✅ Auto-sorted by urgency and date',
              '✅ Works from anywhere — no VPN needed',
              '✅ Re-sync anytime from the dashboard',
            ].map((item, i) => (
              <p key={i} className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {item}
              </p>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            loading={isValidating}
            className="w-full"
            size="lg"
          >
            {isValidating ? 'Checking URL...' : 'Connect & Launch →'}
          </Button>
        </div>
      </div>
    </main>
  )
}
