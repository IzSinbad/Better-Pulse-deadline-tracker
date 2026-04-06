// PATCH /api/deadlines/[id]/complete
// marks a deadline as done — it disappears from all views
// also supports un-completing with ?undo=true

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await validateSession()
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { id } = await params
  const isUndo = new URL(request.url).searchParams.get('undo') === 'true'

  // make sure this deadline belongs to the logged-in user — never touch other people's data
  const { data: deadline, error: dbError } = await supabaseServer
    .from('deadlines')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (dbError || !deadline) {
    return NextResponse.json({ error: `Deadline not found (id: ${id})` }, { status: 404 })
  }

  if (deadline.user_id !== session.userId) {
    return NextResponse.json({ error: `User mismatch (deadline owner: ${deadline.user_id}, session: ${session.userId})` }, { status: 404 })
  }

  await supabaseServer
    .from('deadlines')
    .update({ is_completed: !isUndo })
    .eq('id', id)

  return NextResponse.json({ success: true, completed: !isUndo })
}
