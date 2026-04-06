// GET /api/announcements
// fetches and parses all RSS feeds saved by the user, returns merged announcements

import { NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { fetchRSSFeed } from '@/lib/adapters/rss'

export async function GET() {
  try {
    const session = await validateSession()
    if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

    const { data: feeds, error: dbError } = await supabaseServer
      .from('announcement_feeds')
      .select('id, feed_url_encrypted, course_name')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: true })

    if (dbError) {
      console.error('announcement_feeds query error:', dbError)
      return NextResponse.json({ announcements: [], feeds: [], error: dbError.message })
    }

    if (!feeds || feeds.length === 0) {
      return NextResponse.json({ announcements: [], feeds: [] })
    }

    // fetch all feeds in parallel — one bad feed shouldn't kill the rest
    const results = await Promise.allSettled(
      feeds.map(async feed => {
        const url = decrypt(feed.feed_url_encrypted)
        return fetchRSSFeed(url, feed.id)
      })
    )

    const announcements = results
      .flatMap(result => {
        if (result.status === 'rejected') return []
        return result.value.items
      })
      .sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0))

    return NextResponse.json({
      announcements,
      feeds: feeds.map(f => ({ id: f.id, courseName: f.course_name })),
    })
  } catch (err) {
    console.error('GET /api/announcements error:', err)
    return NextResponse.json({ announcements: [], feeds: [], error: 'Internal error' })
  }
}
