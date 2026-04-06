import { redirect } from 'next/navigation'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'
import { SetupFlow } from '@/components/onboarding/SetupFlow'

interface SetupPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function SetupPage({ searchParams }: SetupPageProps) {
  const session = await validateSession()
  if (!session) redirect('/')

  // if they already connected Brightspace, skip setup
  const { data: user } = await supabaseServer
    .from('users')
    .select('brightspace_token_encrypted, display_name')
    .eq('id', session.userId)
    .single()

  if (user?.brightspace_token_encrypted) {
    redirect('/dashboard')
  }

  const params = await searchParams

  return (
    <SetupFlow
      displayName={user?.display_name ?? 'there'}
      error={params.error ?? null}
    />
  )
}
