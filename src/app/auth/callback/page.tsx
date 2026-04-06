'use client'

// handles the magic link click
// gets the user from the client-side Supabase session, sends their info to finalize

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
        // Supabase puts tokens in the URL hash after magic link click
        // need to manually extract and set the session from the hash
        const hashParams = new URLSearchParams(window.location.hash.slice(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        }

        // now get the confirmed user
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          throw new Error('Login link expired or invalid — try requesting a new one')
        }

        if (!user.email) {
          throw new Error('Could not get your email from the login link')
        }

        setStatus('Login confirmed! Setting things up...')

        // send user info to the server to create/update the DB record + set our session cookie
        // we pass the email and supabase user id — the server verifies via service role
        const res = await fetch('/api/auth/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            supabaseUserId: user.id,
            displayName: user.user_metadata?.full_name ?? user.email.split('@')[0],
          }),
        })

        if (!res.ok) {
          const errData = await res.json() as { error?: string }
          throw new Error(errData.error ?? 'Failed to complete login setup')
        }

        const data = await res.json() as { isNewUser: boolean }
        setStatus('All set! Redirecting...')

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
              Back to login →
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
