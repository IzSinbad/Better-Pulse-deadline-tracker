// POST /api/brightspace/sync
// fetches all deadlines from Brightspace and saves them to our DB
// this is the big one — called on first load and when student hits "Sync Now"

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'
import { BrightspaceAdapter } from '@/lib/adapters/brightspace'
import { getValidBrightspaceToken } from '@/lib/brightspaceAuth'

// we stream progress back as SSE so the loading screen can show live status
// if the client doesn't support SSE, it just gets the final JSON
export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  // get a valid token — auto-refreshes if expired
  let token: string
  try {
    token = await getValidBrightspaceToken(session.userId)
  } catch {
    return NextResponse.json(
      { error: 'Brightspace not connected — go to settings and reconnect' },
      { status: 400 }
    )
  }

  const baseUrl = process.env.BRIGHTSPACE_API_BASE_URL || 'https://conestoga.desire2learn.com'
  const adapter = new BrightspaceAdapter(baseUrl, token)

  // use a streaming response so the frontend can show progress
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      try {
        send('status', { message: 'Connecting to Brightspace...' })

        const courses = await adapter.getCourses()
        send('status', { message: `Found ${courses.length} courses — fetching deadlines...` })

        // fetch deadlines for each course and stream progress
        const allDeadlines = []
        for (const course of courses.filter(c => c.isActive)) {
          send('status', { message: `Loading ${course.code} deadlines...` })
          try {
            const courseDeadlines = await adapter.getDeadlines([course])
            allDeadlines.push(...courseDeadlines)
          } catch (err) {
            // one bad course shouldn't stop everything
            console.error(`Failed to fetch deadlines for ${course.code}:`, err)
          }
        }

        send('status', { message: 'Calculating grade impacts...' })

        // delete old synced deadlines for this user and insert fresh ones
        await supabaseServer
          .from('deadlines')
          .delete()
          .eq('user_id', session.userId)
          .eq('is_manual', false)

        if (allDeadlines.length > 0) {
          const rows = allDeadlines.map(d => ({
            user_id: session.userId,
            brightspace_id: d.lmsId,
            course_code: d.courseCode,
            course_name: d.courseName,
            title: d.title,
            type: d.type,
            due_at: d.dueAt?.toISOString() ?? null,
            weight_percent: d.weightPercent,
            description: d.description,
            deeplink_url: d.deeplinkUrl,
            is_completed: false,
            is_manual: false,
            synced_at: new Date().toISOString(),
          }))

          // insert in chunks so we don't hit the 1MB request limit
          const CHUNK_SIZE = 100
          for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            await supabaseServer.from('deadlines').insert(rows.slice(i, i + CHUNK_SIZE))
          }
        }

        // also save updated course grades
        for (const course of courses) {
          if (course.currentGrade !== null) {
            await supabaseServer
              .from('target_grades')
              .upsert(
                { user_id: session.userId, course_code: course.code, target_percent: null },
                { onConflict: 'user_id,course_code', ignoreDuplicates: true }
              )
          }
        }

        send('status', { message: "All done! 🎉" })
        send('complete', {
          deadlineCount: allDeadlines.length,
          courseCount: courses.length,
          syncedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.error('Sync error:', err)
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
