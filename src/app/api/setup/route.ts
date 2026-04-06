// POST /api/setup
// saves the student's Brightspace token (and optionally their target grades)
// called once after first login — never shown again

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { encrypt } from '@/lib/encryption'
import { supabaseServer } from '@/lib/supabase'
import { BrightspaceAdapter } from '@/lib/adapters/brightspace'

interface SetupBody {
  brightspaceToken: string
  targetGrades?: Array<{ courseCode: string; targetPercent: number }>
}

export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let body: SetupBody
  try {
    body = await request.json() as SetupBody
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { brightspaceToken, targetGrades } = body

  if (!brightspaceToken || typeof brightspaceToken !== 'string') {
    return NextResponse.json({ error: 'Brightspace token is required' }, { status: 400 })
  }

  // actually test the token before saving it — no point storing garbage
  const brightspaceUrl = process.env.BRIGHTSPACE_API_BASE_URL || 'https://learn.conestogac.on.ca'
  const adapter = new BrightspaceAdapter(brightspaceUrl, brightspaceToken)
  const isValid = await adapter.validateToken()

  if (!isValid) {
    return NextResponse.json(
      { error: 'That Brightspace token doesn\'t work — double-check you copied it correctly' },
      { status: 400 }
    )
  }

  // encrypt and save the token
  const encryptedToken = encrypt(brightspaceToken)

  const { error: updateError } = await supabaseServer
    .from('users')
    .update({ brightspace_token_encrypted: encryptedToken })
    .eq('id', session.userId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
  }

  // save target grades if they provided any
  if (targetGrades && targetGrades.length > 0) {
    const gradeRows = targetGrades.map(g => ({
      user_id: session.userId,
      course_code: g.courseCode,
      target_percent: g.targetPercent,
    }))

    await supabaseServer
      .from('target_grades')
      .upsert(gradeRows, { onConflict: 'user_id,course_code' })
  }

  // make sure preferences row exists for this user
  await supabaseServer
    .from('preferences')
    .upsert({ user_id: session.userId }, { onConflict: 'user_id', ignoreDuplicates: true })

  return NextResponse.json({ success: true })
}
