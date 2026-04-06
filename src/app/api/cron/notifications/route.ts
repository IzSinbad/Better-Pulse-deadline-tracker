// GET /api/cron/notifications
// Vercel Cron — runs daily at 9 AM UTC
// sends push notifications for:
//   • deadlines due in ~10 days (first warning)
//   • deadlines due in ~5 days  (second warning)
//   • deadlines due in ~1 day   (final warning)
//   • new course announcements since last check

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { supabaseServer } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import { fetchRSSFeed } from '@/lib/adapters/rss'

// how many days before due date each notification fires
// window is N-1 to N days so each fires exactly once per deadline
const DEADLINE_WINDOWS = [
  { type: '10d', minDays: 9,  maxDays: 10, label: 'due in 10 days' },
  { type: '5d',  minDays: 4,  maxDays: 5,  label: 'due in 5 days' },
  { type: '1d',  minDays: 0,  maxDays: 1,  label: 'due tomorrow' },
] as const

function setupWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL ?? 'admin@better-pulse.app'
  if (!pub || !priv) throw new Error('VAPID keys not set')
  webpush.setVapidDetails(`mailto:${email}`, pub, priv)
}

async function sendToUser(
  userId: string,
  subscriptions: { subscription_json: string }[],
  title: string,
  body: string,
  url: string = '/dashboard'
) {
  const payload = JSON.stringify({ title, body, icon: '/icons/icon-192.png', badge: '/icons/icon-72.png', url })
  const stale: string[] = []

  for (const sub of subscriptions) {
    try {
      const parsed = JSON.parse(sub.subscription_json) as webpush.PushSubscription
      await webpush.sendNotification(parsed, payload)
    } catch (err: unknown) {
      // 410 = subscription expired, remove it
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        stale.push(JSON.parse(sub.subscription_json).endpoint)
      }
    }
  }

  // clean up expired subscriptions
  if (stale.length > 0) {
    await supabaseServer
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId)
      .in('endpoint', stale)
  }
}

async function alreadySent(userId: string, refId: string, type: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from('notification_log')
    .select('id')
    .eq('user_id', userId)
    .eq('ref_id', refId)
    .eq('notification_type', type)
    .single()
  return !!data
}

async function logSent(userId: string, refId: string, type: string) {
  await supabaseServer
    .from('notification_log')
    .insert({ user_id: userId, ref_id: refId, notification_type: type })
    .throwOnError()
}

export async function GET(request: NextRequest) {
  // Vercel signs cron requests with this header — reject anything else
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    setupWebPush()
  } catch {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
  }

  // get all users who have at least one push subscription
  const { data: allSubs } = await supabaseServer
    .from('push_subscriptions')
    .select('user_id, subscription_json')

  if (!allSubs || allSubs.length === 0) {
    return NextResponse.json({ message: 'No subscribers' })
  }

  // group subscriptions by user
  const subsByUser = new Map<string, { subscription_json: string }[]>()
  for (const sub of allSubs) {
    const existing = subsByUser.get(sub.user_id) ?? []
    existing.push({ subscription_json: sub.subscription_json })
    subsByUser.set(sub.user_id, existing)
  }

  const now = Date.now()
  let deadlineNotifsSent = 0
  let announcementNotifsSent = 0

  for (const [userId, subs] of subsByUser) {
    // ── DEADLINE NOTIFICATIONS ──────────────────────────────────────────────
    const { data: deadlines } = await supabaseServer
      .from('deadlines')
      .select('id, title, course_code, course_name, due_at, type')
      .eq('user_id', userId)
      .eq('is_completed', false)
      .not('due_at', 'is', null)
      .gt('due_at', new Date().toISOString())

    for (const deadline of deadlines ?? []) {
      const daysUntil = (new Date(deadline.due_at).getTime() - now) / 86400000

      for (const window of DEADLINE_WINDOWS) {
        if (daysUntil >= window.minDays && daysUntil < window.maxDays) {
          if (await alreadySent(userId, deadline.id, window.type)) continue

          const course = deadline.course_code ?? deadline.course_name ?? 'Unknown'
          await sendToUser(
            userId,
            subs,
            `${deadline.title}`,
            `${course} · ${window.label}`,
            '/dashboard'
          )
          await logSent(userId, deadline.id, window.type)
          deadlineNotifsSent++
        }
      }
    }

    // ── ANNOUNCEMENT NOTIFICATIONS ──────────────────────────────────────────
    const { data: feeds } = await supabaseServer
      .from('announcement_feeds')
      .select('id, feed_url_encrypted, course_name')
      .eq('user_id', userId)

    for (const feed of feeds ?? []) {
      try {
        const url = decrypt(feed.feed_url_encrypted)
        const { items } = await fetchRSSFeed(url, feed.id)

        for (const item of items) {
          // only notify for announcements posted in the last 48h
          const ageHours = item.pubDate
            ? (now - item.pubDate.getTime()) / 3600000
            : 999
          if (ageHours > 48) continue

          if (await alreadySent(userId, item.guid, 'announcement')) continue

          await sendToUser(
            userId,
            subs,
            `New: ${item.title}`,
            `${feed.course_name}`,
            '/dashboard'
          )
          await logSent(userId, item.guid, 'announcement')
          announcementNotifsSent++
        }
      } catch {
        // one bad feed shouldn't stop the rest
      }
    }
  }

  return NextResponse.json({
    ok: true,
    deadlineNotifsSent,
    announcementNotifsSent,
    usersChecked: subsByUser.size,
  })
}
