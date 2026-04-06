// dashboard layout — three column grid: sidebar | main content | assistant panel
// auth check happens here so every dashboard page is protected

import { redirect } from 'next/navigation'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await validateSession()
  if (!session) redirect('/')

  // grab user info for the sidebar
  const [userResult, prefsResult] = await Promise.all([
    supabaseServer
      .from('users')
      .select('id, email, display_name')
      .eq('id', session.userId)
      .single(),
    supabaseServer
      .from('preferences')
      .select('*')
      .eq('user_id', session.userId)
      .single(),
  ])

  if (!userResult.data) redirect('/')

  const canUseAssistant = userResult.data.email.toLowerCase() === 'afarid8011@conestogac.on.ca'

  return (
    <DashboardShell
      user={userResult.data}
      canUseAssistant={canUseAssistant}
      preferences={prefsResult.data ?? {
        dark_mode: true,
        default_view: 'timeline',
        confetti_enabled: true,
        notification_lead_hours: 24,
      }}
    >
      {children}
    </DashboardShell>
  )
}
