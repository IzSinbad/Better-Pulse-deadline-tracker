// session management — 30 day JWT in an HttpOnly cookie
// nothing sensitive goes in localStorage, everything is server-side

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { supabaseServer } from './supabase'

const SESSION_DURATION_DAYS = 30
const COOKIE_NAME = 'bp_session'

function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET env var is missing')
  return secret
}

// hash a token for safe storage in DB (we store hash, not raw token)
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export interface SessionPayload {
  userId: string
  sessionId: string
}

// create a new session for a user after login
// returns the raw JWT to set in the cookie
export async function createSession(
  userId: string,
  deviceHint?: string
): Promise<string> {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  // store a record in supabase so we can invalidate sessions if needed
  const { data: session, error } = await supabaseServer
    .from('sessions')
    .insert({
      user_id: userId,
      token_hash: 'placeholder', // we'll update this after we have the JWT
      expires_at: expiresAt.toISOString(),
      device_hint: deviceHint ?? null,
    })
    .select('id')
    .single()

  if (error || !session) throw new Error('Failed to create session in DB')

  const payload: SessionPayload = { userId, sessionId: session.id }
  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn: `${SESSION_DURATION_DAYS}d`,
  })

  // update the DB record with the hashed token
  await supabaseServer
    .from('sessions')
    .update({ token_hash: hashToken(token) })
    .eq('id', session.id)

  return token
}

// validate the session cookie and return the user ID if valid
// returns null if session is missing, expired, or invalid
export async function validateSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null

  try {
    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload

    // double-check the session still exists in DB (not manually revoked)
    const { data: session } = await supabaseServer
      .from('sessions')
      .select('id, expires_at')
      .eq('id', payload.sessionId)
      .eq('token_hash', hashToken(token))
      .single()

    if (!session) return null
    if (new Date(session.expires_at) < new Date()) return null

    return payload
  } catch {
    // JWT verification failed — expired or tampered
    return null
  }
}

// delete the session (logout)
export async function invalidateSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return

  try {
    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload
    await supabaseServer
      .from('sessions')
      .delete()
      .eq('id', payload.sessionId)
  } catch {
    // token was already invalid, that's fine
  }
}

export { COOKIE_NAME, SESSION_DURATION_DAYS }
