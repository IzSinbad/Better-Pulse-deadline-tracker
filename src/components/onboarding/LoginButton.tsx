'use client'

// the "Sign in with Microsoft" button — this is pretty much the whole landing page
// clicking it sends you to /api/auth/microsoft which redirects to Microsoft's login

import { useState } from 'react'

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  function handleLogin() {
    setIsLoading(true)
    // just navigate to the auth route — it'll redirect to Microsoft
    window.location.href = '/api/auth/microsoft'
  }

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="group relative w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-medium text-sm transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
      style={{
        background: isLoading ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: 'var(--text-primary)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={e => {
        if (!isLoading) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.14)'
        }
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'
      }}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        // Microsoft logo SVG — blue squares
        <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
          <rect x="0" y="0" width="10" height="10" fill="#f25022" rx="0.5" />
          <rect x="11" y="0" width="10" height="10" fill="#7fba00" rx="0.5" />
          <rect x="0" y="11" width="10" height="10" fill="#00a4ef" rx="0.5" />
          <rect x="11" y="11" width="10" height="10" fill="#ffb900" rx="0.5" />
        </svg>
      )}
      {isLoading ? 'Redirecting to Microsoft...' : 'Sign in with Microsoft'}
    </button>
  )
}
