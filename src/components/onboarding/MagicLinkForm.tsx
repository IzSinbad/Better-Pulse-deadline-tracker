'use client'

// magic link login — enter your email, get a link, click it, you're in
// no passwords, no Microsoft admin approval, just works

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function MagicLinkForm() {
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      setError('Enter your email first')
      return
    }
    if (!trimmed.includes('@')) {
      setError("That doesn't look like a valid email")
      return
    }

    setIsSending(true)
    setError('')

    const baseUrl = window.location.origin
    const { error: supabaseError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        // where Supabase redirects after the user clicks the link
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    })

    if (supabaseError) {
      setError(supabaseError.message)
      setIsSending(false)
      return
    }

    setSent(true)
    setIsSending(false)
  }

  if (sent) {
    return (
      <div
        className="w-full rounded-xl p-5 text-center border"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-2xl mb-2">📬</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Check your email
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          We sent a login link to <strong>{email}</strong>
          <br />
          Click it and you&apos;re in — no password needed.
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="mt-3 text-xs underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div
        className="flex rounded-xl overflow-hidden border"
        style={{ background: 'var(--bg-surface)', borderColor: error ? 'rgba(239,68,68,0.4)' : 'var(--border)' }}
      >
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError('') }}
          placeholder="yourname@conestogac.on.ca"
          className="flex-1 px-4 py-3 text-sm bg-transparent outline-none placeholder:opacity-40"
          style={{ color: 'var(--text-primary)' }}
          autoComplete="email"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !email.trim()}
          className="px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'white', flexShrink: 0 }}
        >
          {isSending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
          ) : (
            'Send link →'
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs text-center" style={{ color: 'var(--urgent-critical)' }}>
          {error}
        </p>
      )}
    </form>
  )
}
