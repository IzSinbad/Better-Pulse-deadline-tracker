'use client'

// the setup page — shown once after first login
// one job: connect Brightspace via OAuth2 (just a button click)
// after that the dashboard loads automatically forever

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface SetupFlowProps {
  displayName: string
  error?: string | null
}

export function SetupFlow({ displayName, error }: SetupFlowProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  function connectBrightspace() {
    setIsConnecting(true)
    // redirect to the D2L OAuth2 flow — user logs into Brightspace normally
    // D2L sends them back to /api/auth/brightspace/callback with a code
    window.location.href = '/api/auth/brightspace'
  }

  const firstName = displayName.split(' ')[0]

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99, 102, 241, 0.1), transparent)',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* logo */}
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
            Connect your Brightspace account to pull in all your deadlines.
          </p>
        </div>

        {/* error from OAuth callback if something went wrong */}
        {error && (
          <div
            className="rounded-lg px-4 py-3 mb-4 text-sm border"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.25)',
              color: '#f87171',
            }}
          >
            {error === 'token_exchange_failed'
              ? 'Something went wrong with the Brightspace connection — try again'
              : error === 'access_denied'
              ? "Looks like you cancelled the Brightspace login — try again when you're ready"
              : `Connection error: ${error}`}
          </div>
        )}

        {/* main card */}
        <div
          className="rounded-2xl p-6 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="space-y-5">
            {/* what this does */}
            <div className="space-y-3">
              {[
                { icon: '📅', text: 'All your assignments, quizzes, and exams — automatically' },
                { icon: '📊', text: 'Current grades pulled from each course' },
                { icon: '🔄', text: 'Syncs whenever you want, stays up to date' },
                { icon: '🔒', text: 'Read-only access — the app never changes anything in Brightspace' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="h-px" style={{ background: 'var(--border)' }} />

            {/* the button */}
            <Button
              onClick={connectBrightspace}
              loading={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? 'Opening Brightspace...' : 'Connect Brightspace →'}
            </Button>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              You&apos;ll be taken to Conestoga&apos;s Brightspace login page.
              <br />
              Log in with your Conestoga account and approve access.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
