// landing page — minimal dark design, one button to get started
// redirects to dashboard if already logged in

import { redirect } from 'next/navigation'
import { validateSession } from '@/lib/session'
import { LoginButton } from '@/components/onboarding/LoginButton'

export default async function LandingPage() {
  // if they already have a valid session, skip the landing page entirely
  const session = await validateSession()
  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      {/* background gradient — subtle, not distracting */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full text-center">
        {/* logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            bp
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              better_pulse
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              for Conestoga College
            </p>
          </div>
        </div>

        {/* tagline */}
        <div className="space-y-2">
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            All your deadlines. One place. Actually organized.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Syncs with D2L Brightspace · Grade impact tracking · Smart reminders
          </p>
        </div>

        {/* the main CTA — sign in with Microsoft */}
        <LoginButton />

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Sign in with your Conestoga Microsoft account
          <br />
          <span className="opacity-60">e.g. YourName1234@conestogac.on.ca</span>
        </p>
      </div>

      {/* feature highlights at the bottom — keep it simple */}
      <div className="relative z-10 mt-16 grid grid-cols-3 gap-6 max-w-lg w-full">
        {[
          { icon: '📅', label: 'All deadlines from Brightspace — assignments, quizzes, exams' },
          { icon: '📊', label: 'See how each assignment affects your final grade' },
          { icon: '🔔', label: 'Get notified before things sneak up on you' },
        ].map((f, i) => (
          <div key={i} className="flex flex-col items-center gap-2 text-center">
            <span className="text-2xl">{f.icon}</span>
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {f.label}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
