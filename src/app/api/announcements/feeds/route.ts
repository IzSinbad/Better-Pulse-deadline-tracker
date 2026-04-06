// POST /api/announcements/feeds  — add an RSS feed URL
// DELETE /api/announcements/feeds?id=xxx  — remove a feed

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'
import { encrypt } from '@/lib/encryption'
import { fetchRSSFeed } from '@/lib/adapters/rss'

export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { feedUrl } = await request.json() as { feedUrl: string }
  if (!feedUrl?.startsWith('http')) {
    return NextResponse.json({ error: 'Invalid feed URL' }, { status: 400 })
  }

  // validate and get course name before saving
  let courseName: string
  try {
    const result = await fetchRSSFeed(feedUrl, 'preview')
    courseName = result.courseName
  } catch {
    return NextResponse.json({ error: 'Could not fetch that RSS feed — check the URL' }, { status: 400 })
  }

  // check for duplicates
  const { data: existing } = await supabaseServer
    .from('announcement_feeds')
    .select('id')
    .eq('user_id', session.userId)

  // cap at 20 feeds
  if (existing && existing.length >= 20) {
    return NextResponse.json({ error: 'Maximum 20 feeds reached' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('announcement_feeds')
    .insert({
      user_id: session.userId,
      feed_url_encrypted: encrypt(feedUrl),
      course_name: courseName,
    })
    .select('id, course_name')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to save feed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, feed: data })
}

export async function DELETE(request: NextRequest) {
  const session = await validateSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // verify ownership before deleting
  const { data: feed } = await supabaseServer
    .from('announcement_feeds')
    .select('user_id')
    .eq('id', id)
    .single()

  if (!feed || feed.user_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await supabaseServer.from('announcement_feeds').delete().eq('id', id)

  return NextResponse.json({ success: true })
}
