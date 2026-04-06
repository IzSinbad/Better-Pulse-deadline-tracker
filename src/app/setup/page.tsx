// setup page — shown exactly once after first login
// students paste their Brightspace token and optionally their target grades
// after this they go straight to the dashboard every time

import { redirect } from 'next/navigation'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'
import { SetupFlow } from '@/components/onboarding/SetupFlow'

export default async function SetupPage() {
  const session = await validateSession()
  if (!session) redirect('/')

  // if they already have a token, they don't need setup
  const { data: user } = await supabaseServer
    .from('users')
    .select('brightspace_token_encrypted, display_name')
    .eq('id', session.userId)
    .single()

  if (user?.brightspace_token_encrypted) {
    redirect('/dashboard')
  }

  return <SetupFlow displayName={user?.display_name ?? 'there'} />
}
