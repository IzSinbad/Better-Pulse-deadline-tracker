// GET /api/user
// returns the current user's info — used by the sidebar to show name/avatar
// also returns preferences and target grades

import { NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'

export async function GET() {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const [userResult, prefsResult, targetGradesResult] = await Promise.all([
    supabaseServer
      .from('users')
      .select('id, email, display_name, created_at, last_login')
      .eq('id', session.userId)
      .single(),
    supabaseServer
      .from('preferences')
      .select('*')
      .eq('user_id', session.userId)
      .single(),
    supabaseServer
      .from('target_grades')
      .select('*')
      .eq('user_id', session.userId),
  ])

  if (userResult.error || !userResult.data) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    user: userResult.data,
    preferences: prefsResult.data ?? {
      dark_mode: true,
      default_view: 'timeline',
      confetti_enabled: true,
      notification_lead_hours: 24,
    },
    targetGrades: targetGradesResult.data ?? [],
  })
}

// PATCH /api/user — update preferences
export async function PATCH(request: Request) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const body = await request.json() as Record<string, unknown>

  // only allow updating these fields
  const allowedFields = ['dark_mode', 'default_view', 'confetti_enabled', 'notification_lead_hours']
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updates[field] = body[field]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('preferences')
    .upsert({ user_id: session.userId, ...updates, updated_at: new Date().toISOString() })

  if (error) {
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
