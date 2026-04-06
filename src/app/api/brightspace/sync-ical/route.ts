// POST /api/brightspace/sync-ical
// fetches the student's Brightspace calendar ICS feed and saves all deadlines
// same SSE streaming as the OAuth sync — same loading screen works for both

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { decrypt } from '@/lib/encryption'
import { supabaseServer } from '@/lib/supabase'
import { fetchICalDeadlines } from '@/lib/adapters/ical'

export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  // get the stored ICS feed URL
  const { data: user } = await supabaseServer
    .from('users')
    .select('brightspace_ical_url_encrypted')
    .eq('id', session.userId)
    .single()

  if (!user?.brightspace_ical_url_encrypted) {
    return NextResponse.json(
      { error: 'No calendar feed URL saved — complete setup first' },
      { status: 400 }
    )
  }

  const feedUrl = decrypt(user.brightspace_ical_url_encrypted)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        send('status', { message: 'Connecting to Brightspace calendar...' })

        const deadlines = await fetchICalDeadlines(feedUrl)
        send('status', { message: `Found ${deadlines.length} upcoming deadlines — saving...` })

        // fetch which deadlines the user already marked done — preserve that across syncs
        const { data: completed } = await supabaseServer
          .from('deadlines')
          .select('brightspace_id')
          .eq('user_id', session.userId)
          .eq('is_completed', true)
          .eq('is_manual', false)

        const completedIds = new Set((completed ?? []).map(d => d.brightspace_id).filter(Boolean))

        // wipe old synced deadlines and replace with fresh ones
        await supabaseServer
          .from('deadlines')
          .delete()
          .eq('user_id', session.userId)
          .eq('is_manual', false)

        if (deadlines.length > 0) {
          // group by course so we can show progress per course
          const courseNames = [...new Set(deadlines.map(d => d.courseCode))]
          for (const course of courseNames) {
            send('status', { message: `Loading ${course} deadlines...` })
          }

          const rows = deadlines.map(d => ({
            user_id: session.userId,
            brightspace_id: d.uid,
            course_code: d.courseCode,
            course_name: d.courseName,
            title: d.title,
            type: d.type,
            due_at: d.dueAt?.toISOString() ?? null,
            weight_percent: null,
            description: d.description,
            deeplink_url: d.deeplinkUrl,
            // if this deadline was marked done before the sync, keep it done
            is_completed: completedIds.has(d.uid ?? ''),
            is_manual: false,
            synced_at: new Date().toISOString(),
          }))

          // insert in batches
          const CHUNK = 100
          for (let i = 0; i < rows.length; i += CHUNK) {
            await supabaseServer.from('deadlines').insert(rows.slice(i, i + CHUNK))
          }
        }

        send('status', { message: 'Calculating grade impacts...' })
        send('status', { message: 'All done! 🎉' })
        send('complete', {
          deadlineCount: deadlines.length,
          courseCount: [...new Set(deadlines.map(d => d.courseCode))].length,
          syncedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('ICS sync error:', err)
        send('error', { message: err instanceof Error ? err.message : 'Sync failed' })
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
