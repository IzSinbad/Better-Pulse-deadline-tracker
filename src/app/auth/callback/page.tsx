'use client'

// handles the magic link click — Supabase redirects here after the user clicks their email link
// we confirm the session, create/update the user in our DB, set our session cookie, then redirect

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Confirming your login...')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase puts the session tokens in the URL hash — grab them
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          // try to exchange the code/token from the URL if direct session didn't work
          const hashParams = new URLSearchParams(window.location.hash.slice(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
            const { data: { session: newSession } } = await supabase.auth.getSession()
            if (!newSession) throw new Error('Could not establish session')
          } else {
            throw new Error('No session found in the login link — it may have expired')
          }
        }

        setStatus('Login confirmed! Setting things up...')

        // now call our API to create/update the user record and set our session cookie
        const res = await fetch('/api/auth/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        if (!res.ok) {
          throw new Error('Failed to complete login setup')
        }

        const data = await res.json() as { isNewUser: boolean }
        setStatus('All set! Redirecting...')

        // new user → setup, returning user → dashboard
        setTimeout(() => {
          router.push(data.isNewUser ? '/setup' : '/dashboard')
        }, 500)
      } catch (err) {
        console.error('Auth callback error:', err)
        setStatus(err instanceof Error ? err.message : 'Login failed')
        setIsError(true)
      }
    }

    handleCallback()
  }, [router])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          bp
        </div>

        {!isError ? (
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{status}</p>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-sm" style={{ color: 'var(--urgent-critical)' }}>{status}</p>
            <a href="/" className="text-sm underline" style={{ color: 'var(--accent)' }}>
              Back to login
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
