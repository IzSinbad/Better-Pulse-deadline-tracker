'use client'

// the 3-step setup wizard — Brightspace token → optional API key → optional target grades
// this whole thing only runs once, then they never see it again

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface SetupFlowProps {
  displayName: string
}

type Step = 1 | 2 | 3

export function SetupFlow({ displayName }: SetupFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [brightspaceToken, setBrightspaceToken] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // step 1 — validate the Brightspace token before letting them continue
  async function handleTokenSubmit() {
    if (!brightspaceToken.trim()) {
      setTokenError('Paste your token here — it should start with a long string')
      return
    }
    setIsValidating(true)
    setTokenError('')

    try {
      // quick validation check before saving
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brightspaceToken: brightspaceToken.trim() }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setTokenError(data.error ?? 'Token validation failed — make sure you copied it correctly')
        return
      }

      // token works! move on
      setStep(3)
    } catch {
      setTokenError('Something went wrong — check your connection and try again')
    } finally {
      setIsValidating(false)
    }
  }

  async function handleFinish() {
    setIsSaving(true)
    try {
      router.push('/dashboard/loading')
    } catch {
      router.push('/dashboard')
    }
  }

  const firstLogin = displayName !== 'there'

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* subtle gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99, 102, 241, 0.1), transparent)',
        }}
      />

      <div className="relative z-10 w-full max-w-lg">
        {/* header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex w-10 h-10 rounded-xl items-center justify-center text-lg font-bold mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            bp
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {firstLogin ? `Hey ${displayName.split(' ')[0]}!` : 'Quick setup'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Takes about 2 minutes. You only do this once.
          </p>
        </div>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {([1, 2, 3] as Step[]).map(s => (
            <div
              key={s}
              className="transition-all duration-300 rounded-full"
              style={{
                width: s === step ? '24px' : '8px',
                height: '8px',
                background: s <= step ? '#6366f1' : 'var(--bg-elevated)',
              }}
            />
          ))}
        </div>

        {/* step card */}
        <div
          className="rounded-2xl p-6 border"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          {step === 1 && (
            <StepOne
              token={brightspaceToken}
              setToken={setBrightspaceToken}
              error={tokenError}
              onNext={handleTokenSubmit}
              isLoading={isValidating}
            />
          )}
          {step === 2 && (
            // step 2 was removed — token validates on step 1 now
            // skip straight to step 3
            <>{setStep(3)}</>
          )}
          {step === 3 && (
            <StepThree onFinish={handleFinish} isLoading={isSaving} />
          )}
        </div>
      </div>
    </main>
  )
}

function StepOne({
  token,
  setToken,
  error,
  onNext,
  isLoading,
}: {
  token: string
  setToken: (v: string) => void
  error: string
  onNext: () => void
  isLoading: boolean
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Step 1 of 2 — Connect Brightspace
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          We need your Brightspace API token to sync your deadlines.
        </p>
      </div>

      {/* how to get the token */}
      <div
        className="rounded-lg p-4 text-sm space-y-1.5 border"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
          How to get your token:
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Go to <strong>learn.conestogac.on.ca</strong> and log in</li>
          <li>Click your name → <strong>Profile</strong></li>
          <li>Click <strong>Manage API Tokens</strong></li>
          <li>Click <strong>New Token</strong>, give it a name like &quot;better_pulse&quot;</li>
          <li>Copy the generated token and paste it below</li>
        </ol>
      </div>

      <Input
        label="Your Brightspace API Token"
        placeholder="Paste your token here..."
        value={token}
        onChange={e => setToken(e.target.value)}
        error={error}
        type="password"
        autoComplete="off"
      />

      <Button onClick={onNext} loading={isLoading} className="w-full">
        {isLoading ? 'Verifying...' : 'Verify & Continue →'}
      </Button>
    </div>
  )
}

function StepThree({
  onFinish,
  isLoading,
}: {
  onFinish: () => void
  isLoading: boolean
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Step 2 of 2 — You&apos;re all set! 🎉
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          We&apos;re ready to sync your deadlines from Brightspace. This takes a few seconds on first load.
        </p>
      </div>

      <div
        className="rounded-lg p-4 text-sm border"
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <p>✅ Brightspace connected</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          You can set target grades per course from the dashboard settings after loading.
        </p>
      </div>

      <Button onClick={onFinish} loading={isLoading} className="w-full">
        {isLoading ? 'Loading your dashboard...' : 'Launch better_pulse →'}
      </Button>
    </div>
  )
}
