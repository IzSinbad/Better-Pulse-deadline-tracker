// POST /api/setup-ical
// saves the student's Brightspace ICS calendar feed URL
// validates it actually works before saving

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { encrypt } from '@/lib/encryption'
import { supabaseServer } from '@/lib/supabase'
import { validateICalUrl } from '@/lib/adapters/ical'

export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const body = await request.json() as { feedUrl: string }
  const { feedUrl } = body

  if (!feedUrl || typeof feedUrl !== 'string') {
    return NextResponse.json({ error: 'Feed URL is required' }, { status: 400 })
  }

  // basic URL sanity check
  if (!feedUrl.startsWith('http')) {
    return NextResponse.json(
      { error: 'That doesn\'t look like a valid URL — it should start with https://' },
      { status: 400 }
    )
  }

  // test that it actually works
  const isValid = await validateICalUrl(feedUrl)
  if (!isValid) {
    return NextResponse.json(
      { error: 'Couldn\'t fetch that calendar URL — double-check you copied the whole link' },
      { status: 400 }
    )
  }

  // save it encrypted
  await supabaseServer
    .from('users')
    .update({ brightspace_ical_url_encrypted: encrypt(feedUrl) })
    .eq('id', session.userId)

  // make sure preferences row exists
  await supabaseServer
    .from('preferences')
    .upsert({ user_id: session.userId }, { onConflict: 'user_id', ignoreDuplicates: true })

  return NextResponse.json({ success: true })
}
