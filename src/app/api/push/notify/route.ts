// POST /api/push/notify
// sends push notifications to all subscribed devices for a user
// meant to be called by a cron job or triggered manually
// checks for deadlines due within the user's notification lead time

import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'

// configure web-push with VAPID keys — these need to be set in env
function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL || 'admin@better-pulse.app'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured — run npx web-push generate-vapid-keys')
  }

  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey)
}

export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  try {
    configureWebPush()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Push not configured' },
      { status: 500 }
    )
  }

  // get user preferences for notification lead time
  const { data: prefs } = await supabaseServer
    .from('preferences')
    .select('notification_lead_hours')
    .eq('user_id', session.userId)
    .single()

  const leadHours = prefs?.notification_lead_hours ?? 24
  const cutoff = new Date(Date.now() + leadHours * 60 * 60 * 1000)

  // find deadlines due within the lead time
  const { data: deadlines } = await supabaseServer
    .from('deadlines')
    .select('*')
    .eq('user_id', session.userId)
    .eq('is_completed', false)
    .lte('due_at', cutoff.toISOString())
    .gte('due_at', new Date().toISOString())
    .order('due_at', { ascending: true })
    .limit(5)

  if (!deadlines || deadlines.length === 0) {
    return NextResponse.json({ sent: 0, message: 'Nothing due in the next window' })
  }

  // get all subscriptions for this user
  const { data: subscriptions } = await supabaseServer
    .from('push_subscriptions')
    .select('subscription_json')
    .eq('user_id', session.userId)

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No push subscriptions' })
  }

  // build a summary notification
  const firstDeadline = deadlines[0]
  const title = deadlines.length === 1
    ? `${firstDeadline.title} due soon`
    : `${deadlines.length} deadlines coming up`
  const body = deadlines.length === 1
    ? `${firstDeadline.course_code} · ${formatTimeUntil(firstDeadline.due_at)}`
    : deadlines.slice(0, 3).map(d => `• ${d.title}`).join('\n')

  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    url: '/dashboard',
  })

  let sent = 0
  for (const sub of subscriptions) {
    try {
      const subscription = JSON.parse(sub.subscription_json) as webpush.PushSubscription
      await webpush.sendNotification(subscription, payload)
      sent++
    } catch (err) {
      // subscription might be expired — just skip it
      console.warn('Push notification failed:', err)
    }
  }

  return NextResponse.json({ sent })
}

function formatTimeUntil(dueAt: string | null): string {
  if (!dueAt) return 'no date'
  const hours = Math.round((new Date(dueAt).getTime() - Date.now()) / 3600000)
  if (hours < 1) return 'due very soon'
  if (hours < 24) return `due in ${hours}h`
  return `due in ${Math.floor(hours / 24)}d`
}
