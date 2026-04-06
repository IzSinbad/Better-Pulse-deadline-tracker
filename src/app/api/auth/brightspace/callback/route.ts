// GET /api/auth/brightspace/callback
// D2L redirects here after the student logs in and approves access
// we exchange the code for access + refresh tokens and save them encrypted

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { encrypt } from '@/lib/encryption'

const D2L_TOKEN_URL = 'https://auth.brightspace.com/core/connect/token'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/setup?error=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/setup?error=missing_params', request.url))
  }

  // decode state to get the user ID
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString()) as { userId: string }
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(new URL('/setup?error=invalid_state', request.url))
  }

  const clientId = process.env.BRIGHTSPACE_CLIENT_ID!
  const clientSecret = process.env.BRIGHTSPACE_CLIENT_SECRET!
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/brightspace/callback`

  // exchange the code for tokens
  const tokenRes = await fetch(D2L_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('D2L token exchange failed:', err)
    return NextResponse.redirect(new URL('/setup?error=token_exchange_failed', request.url))
  }

  const tokens = await tokenRes.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  // save both tokens encrypted — access token for API calls, refresh to get new ones
  await supabaseServer
    .from('users')
    .update({
      brightspace_token_encrypted: encrypt(tokens.access_token),
      brightspace_refresh_token_encrypted: encrypt(tokens.refresh_token),
    })
    .eq('id', userId)

  // connected! go straight to the loading/sync screen
  return NextResponse.redirect(new URL('/dashboard/loading', request.url))
}
