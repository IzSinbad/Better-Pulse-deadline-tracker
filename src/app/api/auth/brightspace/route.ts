// GET /api/auth/brightspace
// kicks off the D2L OAuth2 flow — redirects the user to D2L's login page
// they log in with their Conestoga credentials there, D2L sends us a code back

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'

// D2L's central auth server — same for all Brightspace instances
const D2L_AUTH_URL = 'https://auth.brightspace.com/oauth2/auth'

// the scopes we need to read courses, deadlines, and grades
// keeping it read-only — we don't need to write anything
const SCOPES = [
  'core:*:*',
  'enrollment:orgunit:read',
  'grade:gradevalue:read',
  'dropbox:folder:read',
  'quizzing:quiz:read',
  'content:toc:read',
].join(' ')

export async function GET(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const clientId = process.env.BRIGHTSPACE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: 'BRIGHTSPACE_CLIENT_ID not configured' },
      { status: 500 }
    )
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/brightspace/callback`

  // state param ties the callback back to this session — basic CSRF protection
  const state = Buffer.from(JSON.stringify({ userId: session.userId })).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state,
  })

  return NextResponse.redirect(`${D2L_AUTH_URL}?${params.toString()}`)
}
