// GET /api/auth/callback
// Microsoft redirects back here after the student signs in
// we exchange the code for user info, create/update their account, set the session cookie

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { exchangeCodeForUser } from '@/lib/auth'
import { createSession, COOKIE_NAME, SESSION_DURATION_DAYS } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Microsoft sometimes sends an error back (e.g., user cancelled login)
  if (error) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?error=no_code', request.url))
  }

  try {
    // exchange the code for actual user info
    const msUser = await exchangeCodeForUser(code)

    // upsert the user in our DB — create them if first time, update last_login otherwise
    const { data: user, error: dbError } = await supabaseServer
      .from('users')
      .upsert(
        {
          microsoft_user_id: msUser.id,
          email: msUser.email,
          display_name: msUser.displayName,
          last_login: new Date().toISOString(),
        },
        { onConflict: 'microsoft_user_id', ignoreDuplicates: false }
      )
      .select('id, brightspace_token_encrypted')
      .single()

    if (dbError || !user) {
      throw new Error(`DB upsert failed: ${dbError?.message}`)
    }

    // create a 30-day session
    const deviceHint = request.headers.get('user-agent')?.slice(0, 100) ?? undefined
    const sessionToken = await createSession(user.id, deviceHint)

    // set the HttpOnly cookie — 30 days, secure in prod
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const isProd = baseUrl.startsWith('https://')

    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
      path: '/',
    })

    // if they haven't set up their Brightspace token yet, go to setup
    // otherwise go straight to the dashboard
    const destination = user.brightspace_token_encrypted ? '/dashboard' : '/setup'
    return NextResponse.redirect(new URL(destination, request.url))
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(
      new URL('/?error=auth_failed', request.url)
    )
  }
}
