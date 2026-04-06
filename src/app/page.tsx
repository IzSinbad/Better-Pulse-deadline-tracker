// landing page — email magic link login
// no Microsoft admin approval needed, works with any email
// students use their Conestoga email: afarid8011@conestogac.on.ca

import { redirect } from 'next/navigation'
import { validateSession } from '@/lib/session'
import { MagicLinkForm } from '@/components/onboarding/MagicLinkForm'

export default async function LandingPage() {
  const session = await validateSession()
  if (session) redirect('/dashboard')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'var(--bg-base)' }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.15), transparent)' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full text-center">
        {/* logo */}
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

        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          All your deadlines. One place. Actually organized.
        </p>

        <MagicLinkForm />

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Use your Conestoga email — we&apos;ll send a login link, no password needed.
        </p>
      </div>

      <div className="relative z-10 mt-16 grid grid-cols-3 gap-6 max-w-lg w-full">
        {[
          { icon: '📅', label: 'Syncs with Brightspace — assignments, quizzes, exams' },
          { icon: '📊', label: 'Grade impact on every item — know what you need' },
          { icon: '🔔', label: 'Reminders before things sneak up on you' },
        ].map((f, i) => (
          <div key={i} className="flex flex-col items-center gap-2 text-center">
            <span className="text-2xl">{f.icon}</span>
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>{f.label}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
