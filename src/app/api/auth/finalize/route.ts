// POST /api/auth/finalize
// called after the Supabase magic link is confirmed
// creates/updates the user in our DB and sets the 30-day session cookie

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseServer } from '@/lib/supabase'
import { createSession, COOKIE_NAME, SESSION_DURATION_DAYS } from '@/lib/session'

export async function POST(request: NextRequest) {
  // create a Supabase client that can read the auth cookies from the request
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  // get the authenticated user from Supabase's session
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // check if this user already exists in our DB
  const { data: existing } = await supabaseServer
    .from('users')
    .select('id, brightspace_ical_url_encrypted, brightspace_token_encrypted')
    .eq('email', user.email!)
    .single()

  let userId: string
  let isNewUser: boolean

  if (existing) {
    // returning user — just update last login
    userId = existing.id
    isNewUser = !existing.brightspace_ical_url_encrypted && !existing.brightspace_token_encrypted
    await supabaseServer
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId)
  } else {
    // brand new user — create their record
    const { data: newUser, error: insertError } = await supabaseServer
      .from('users')
      .insert({
        microsoft_user_id: user.id, // using supabase user id in the microsoft_user_id field — same purpose
        email: user.email!,
        display_name: user.email!.split('@')[0], // e.g. "afarid8011"
        last_login: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError || !newUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    userId = newUser.id
    isNewUser = true
  }

  // create our 30-day session cookie
  const deviceHint = request.headers.get('user-agent')?.slice(0, 100) ?? undefined
  const sessionToken = await createSession(userId, deviceHint)

  const isProd = (process.env.NEXTAUTH_URL || '').startsWith('https://')
  cookieStore.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: '/',
  })

  return NextResponse.json({ success: true, isNewUser })
}
