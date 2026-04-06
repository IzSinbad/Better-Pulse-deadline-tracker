// POST /api/push/subscribe
// saves a push subscription for the logged-in student so we can send them notifications
// called after they grant notification permission in the browser

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const subscription = await request.json() as PushSubscriptionJSON
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
  }

  // save subscription alongside the user — one subscription per device basically
  const { error } = await supabaseServer
    .from('push_subscriptions')
    .upsert(
      {
        user_id: session.userId,
        endpoint: subscription.endpoint,
        subscription_json: JSON.stringify(subscription),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )

  if (error) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// DELETE /api/push/subscribe — unsubscribe this device
export async function DELETE(request: NextRequest) {
  const session = await validateSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { endpoint } = await request.json() as { endpoint: string }

  await supabaseServer
    .from('push_subscriptions')
    .delete()
    .eq('user_id', session.userId)
    .eq('endpoint', endpoint)

  return NextResponse.json({ success: true })
}
