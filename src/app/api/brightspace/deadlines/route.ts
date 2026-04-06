// GET /api/brightspace/deadlines
// returns all cached deadlines for the logged-in student
// also fetches their target grades and current grades to compute the grade impact stuff

import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/session'
import { decrypt } from '@/lib/encryption'
import { supabaseServer } from '@/lib/supabase'
import { BrightspaceAdapter } from '@/lib/adapters/brightspace'
import type { EnrichedDeadline } from '@/types/app'
import { URGENCY_THRESHOLDS } from '@/types/app'

export async function GET(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  // grab everything in parallel — faster
  const [deadlinesResult, targetGradesResult, userResult] = await Promise.all([
    supabaseServer
      .from('deadlines')
      .select('*')
      .eq('user_id', session.userId)
      .eq('is_completed', false)
      .order('due_at', { ascending: true }),
    supabaseServer
      .from('target_grades')
      .select('*')
      .eq('user_id', session.userId),
    supabaseServer
      .from('users')
      .select('brightspace_token_encrypted')
      .eq('id', session.userId)
      .single(),
  ])

  const deadlines = deadlinesResult.data ?? []
  const targetGrades = targetGradesResult.data ?? []

  // build a quick lookup map for target grades
  const targetGradeMap = new Map(
    targetGrades.map(tg => [tg.course_code, tg.target_percent])
  )

  // get current grades from Brightspace if we have a token
  const currentGradeMap = new Map<string, number>()
  if (userResult.data?.brightspace_token_encrypted) {
    try {
      const token = decrypt(userResult.data.brightspace_token_encrypted)
      const baseUrl = process.env.BRIGHTSPACE_API_BASE_URL || 'https://learn.conestogac.on.ca'
      const adapter = new BrightspaceAdapter(baseUrl, token)
      const courses = await adapter.getCourses()
      for (const course of courses) {
        if (course.currentGrade !== null) {
          currentGradeMap.set(course.code, course.currentGrade)
        }
      }
    } catch (err) {
      // if this fails, we just won't show grade impact — not a blocker
      console.warn('Could not fetch current grades:', err)
    }
  }

  const now = new Date()

  // enrich each deadline with computed stuff
  const enriched: EnrichedDeadline[] = deadlines.map(d => {
    const dueAt = d.due_at ? new Date(d.due_at) : null
    const msUntilDue = dueAt ? dueAt.getTime() - now.getTime() : Infinity
    const hoursUntilDue = msUntilDue / (1000 * 60 * 60)

    let urgency: EnrichedDeadline['urgency']
    if (msUntilDue < 0) urgency = 'overdue'
    else if (hoursUntilDue < URGENCY_THRESHOLDS.critical) urgency = 'critical'
    else if (hoursUntilDue < URGENCY_THRESHOLDS.high) urgency = 'high'
    else if (hoursUntilDue < URGENCY_THRESHOLDS.medium) urgency = 'medium'
    else urgency = 'low'

    const timeUntilDueLabel = formatTimeUntilDue(msUntilDue)
    const currentGrade = d.course_code ? (currentGradeMap.get(d.course_code) ?? null) : null
    const targetGrade = d.course_code ? (targetGradeMap.get(d.course_code) ?? null) : null

    // rough grade needed calc — simplified version
    // real calculation needs the full grade breakdown, this is an estimate
    const gradeNeededForTarget =
      targetGrade !== null && currentGrade !== null && d.weight_percent
        ? calcGradeNeeded(currentGrade, targetGrade, d.weight_percent)
        : null

    const gradeIfZero =
      currentGrade !== null && d.weight_percent
        ? Math.max(0, currentGrade - d.weight_percent)
        : null

    return {
      ...d,
      urgency,
      msUntilDue,
      timeUntilDueLabel,
      currentGrade,
      targetGrade,
      gradeNeededForTarget,
      gradeIfZero,
      estimatedHours: null, // this gets filled in by the assistant service
      summary: null,        // same
    }
  })

  return NextResponse.json({
    deadlines: enriched,
    lastSynced: deadlines[0]?.synced_at ?? null,
  })
}

// how many hours/days until something is due — like "Due in 2 days, 4 hours"
function formatTimeUntilDue(ms: number): string {
  if (ms < 0) return 'Overdue'
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days === 0 && hours === 0) return 'Due very soon'
  if (days === 0) return `Due in ${hours}h`
  if (remainingHours === 0) return `Due in ${days}d`
  return `Due in ${days}d ${remainingHours}h`
}

// simplified grade needed calculator
// assumes remaining weight is evenly distributed — rough estimate
function calcGradeNeeded(
  currentGrade: number,
  targetGrade: number,
  itemWeight: number
): number | null {
  // what you need on this item to reach target
  // formula: needed = (target - current * (1 - weight/100)) / (weight/100)
  const weightDecimal = itemWeight / 100
  const needed = (targetGrade - currentGrade * (1 - weightDecimal)) / weightDecimal
  if (needed < 0) return 0
  if (needed > 100) return null // mathematically impossible
  return Math.round(needed * 10) / 10
}
