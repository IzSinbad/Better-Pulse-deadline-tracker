// POST /api/auth/logout
// kills the session and clears the cookie — pretty simple

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { invalidateSession, COOKIE_NAME } from '@/lib/session'

export async function POST() {
  try {
    await invalidateSession()

    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Logout error:', err)
    // even if something went wrong server-side, clear the cookie
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    return NextResponse.json({ success: true })
  }
}
