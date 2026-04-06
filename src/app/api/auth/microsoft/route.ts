// GET /api/auth/microsoft
// kicks off the Microsoft OAuth flow — just redirects the user to Microsoft's login page

import { NextResponse } from 'next/server'
import { getMicrosoftLoginUrl } from '@/lib/auth'

export async function GET() {
  try {
    const loginUrl = await getMicrosoftLoginUrl()
    return NextResponse.redirect(loginUrl)
  } catch (err) {
    console.error('Failed to build Microsoft login URL:', err)
    return NextResponse.json(
      { error: 'Could not start Microsoft login — check your OAuth env vars' },
      { status: 500 }
    )
  }
}
