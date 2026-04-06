// POST /api/auth/finalize
// called from the client after Supabase confirms the magic link
// receives user info in the request body, verifies via service role admin API,
// then creates/updates our app user record and sets the 30-day session cookie

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseServer } from '@/lib/supabase'
import { createSession, COOKIE_NAME, SESSION_DURATION_DAYS } from '@/lib/session'

interface FinalizeBody {
  email: string
  supabaseUserId: string
  displayName?: string
}

export async function POST(request: NextRequest) {
  let body: FinalizeBody
  try {
    body = await request.json() as FinalizeBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { email, supabaseUserId, displayName } = body

  if (!email || !supabaseUserId) {
    return NextResponse.json({ error: 'Missing email or user ID' }, { status: 400 })
  }

  // only allow Conestoga student/staff emails
  if (!email.toLowerCase().endsWith('@conestogac.on.ca') && !email.toLowerCase().endsWith('@conestoga.ca')) {
    return NextResponse.json({ error: 'Only Conestoga College email addresses are allowed' }, { status: 403 })
  }

  // verify this Supabase user actually exists using the service role admin API
  // stops anyone from forging a finalize call with a random email
  const { data: authData, error: authError } = await supabaseServer.auth.admin.getUserById(supabaseUserId)

  if (authError || !authData?.user || authData.user.email !== email) {
    console.error('Auth verification failed:', authError?.message)
    return NextResponse.json({ error: 'Could not verify your identity' }, { status: 401 })
  }

  // check if this email already has an account in our users table
  const { data: existing } = await supabaseServer
    .from('users')
    .select('id, brightspace_ical_url_encrypted, brightspace_token_encrypted')
    .eq('email', email)
    .single()

  let userId: string
  let isNewUser: boolean

  if (existing) {
    userId = existing.id
    isNewUser = !existing.brightspace_ical_url_encrypted && !existing.brightspace_token_encrypted
    await supabaseServer
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
  } else {
    // first login — create their record
    const { data: newUser, error: insertError } = await supabaseServer
      .from('users')
      .insert({
        microsoft_user_id: supabaseUserId,
        email,
        display_name: displayName ?? email.split('@')[0],
        last_login: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !newUser) {
      console.error('Failed to insert user:', insertError)
      return NextResponse.json({ error: 'Failed to create your account' }, { status: 500 })
    }

    userId = newUser.id
    isNewUser = true
  }

  // create our 30-day session cookie
  const deviceHint = request.headers.get('user-agent')?.slice(0, 100) ?? undefined
  const sessionToken = await createSession(userId, deviceHint)

  const isProd = (process.env.NEXTAUTH_URL || '').startsWith('https://')
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  })

  return NextResponse.json({ success: true, isNewUser })
}
