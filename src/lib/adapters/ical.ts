// ICS calendar feed adapter — Conestoga D2L specific
// after checking the raw feed, Conestoga uses LOCATION for the course name:
//   LOCATION:PROG73040-26W-Sec1-Big Data Integration and Processing
//   DESCRIPTION:Assignments:\nAssignment 05 - https://deeplink\n\nView event - https://...
// so we parse LOCATION for course info and DESCRIPTION for the deep link

import type { LMSDeadline } from './base'

export interface ICalDeadline extends LMSDeadline {
  uid: string
}

export async function fetchICalDeadlines(feedUrl: string): Promise<ICalDeadline[]> {
  const res = await fetch(feedUrl, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to fetch calendar feed: ${res.status}`)
  }

  const icsText = await res.text()
  if (!icsText.includes('BEGIN:VCALENDAR')) {
    throw new Error('That URL didn\'t return a valid calendar — make sure you copied the whole URL')
  }

  return parseICS(icsText)
}

export async function validateICalUrl(feedUrl: string): Promise<boolean> {
  try {
    await fetchICalDeadlines(feedUrl)
    return true
  } catch {
    return false
  }
}

function parseICS(icsText: string): ICalDeadline[] {
  const deadlines: ICalDeadline[] = []

  // normalize line endings + unfold folded lines (ICS wraps at 75 chars with leading whitespace)
  const unfolded = icsText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '')

  const eventBlocks = unfolded.split('BEGIN:VEVENT').slice(1)

  for (const block of eventBlocks) {
    try {
      const props = parseEventBlock(block)
      if (!props.dtstart) continue

      const dueDate = parseICSDate(props.dtstart)
      if (!dueDate) continue

      // skip events older than 2 days — they're done
      if (dueDate.getTime() < Date.now() - 2 * 86400000) continue

      // LOCATION field has the full course string:
      // "PROG73040-26W-Sec1-Big Data Integration and Processing"
      const location = props.location ?? ''
      const courseCode = parseCourseCode(location)
      const courseName = parseCourseFullName(location)

      // deep link is inside the DESCRIPTION — extract the first https:// URL
      const deepLink = extractFirstUrl(props.description ?? '') ?? props.url ?? null

      const type = inferType(props.description ?? '', props.summary ?? '', location)

      deadlines.push({
        uid: props.uid ?? `ical-${Date.now()}-${Math.random()}`,
        lmsId: `ical-${props.uid ?? Date.now()}`,
        courseCode,
        courseName,
        title: cleanText(props.summary ?? 'Untitled'),
        type,
        dueAt: dueDate,
        weightPercent: null,
        description: buildDescription(props.description ?? '', courseName),
        deeplinkUrl: deepLink,
      })
    } catch {
      // one bad event shouldn't kill the whole parse
    }
  }

  return deadlines.sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0))
}

function parseEventBlock(block: string): Record<string, string> {
  const props: Record<string, string> = {}
  const lines = block.split('\n')

  for (const line of lines) {
    if (line.startsWith('END:VEVENT')) break
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const rawKey = line.slice(0, colonIdx).toLowerCase().split(';')[0]
    const value = line.slice(colonIdx + 1).trim()
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')

    props[rawKey] = value
  }

  return props
}

function parseICSDate(dateStr: string): Date | null {
  try {
    const clean = dateStr.split('\n')[0].trim()

    if (clean.length === 8) {
      // date only: 20250410 — treat as end of day
      return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T23:59:00Z`)
    }
    if (clean.length >= 15) {
      const y = clean.slice(0, 4)
      const mo = clean.slice(4, 6)
      const d = clean.slice(6, 8)
      const h = clean.slice(9, 11)
      const mi = clean.slice(11, 13)
      const s = clean.slice(13, 15)
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${clean.endsWith('Z') ? 'Z' : ''}`)
    }
    return null
  } catch {
    return null
  }
}

// parse "PROG73040-26W-Sec1-Big Data Integration and Processing" → "PROG73040"
function parseCourseCode(location: string): string {
  if (!location) return 'Unknown'
  // match the course code at the start: letters + digits (e.g. PROG73040, CLSC72000, COMP72070)
  const match = location.match(/^([A-Z]{2,6}\d{4,5}[A-Z]?)/i)
  if (match) return match[1].toUpperCase()
  // fallback: take whatever's before the first dash
  return location.split('-')[0].trim() || 'Unknown'
}

// parse "PROG73040-26W-Sec1-Big Data Integration and Processing" → "Big Data Integration and Processing"
// pattern: [CODE]-[SEMESTER]-Sec[N]-[NAME]
function parseCourseFullName(location: string): string {
  if (!location) return 'Unknown Course'
  // strip the code-semester-section prefix: everything up to and including "SecN-"
  const secMatch = location.match(/^[^-]+-[^-]+-Sec\d+-(.+)$/i)
  if (secMatch) return secMatch[1].trim()
  // fallback: if there's a dash, take everything after the first one
  const dashIdx = location.indexOf('-')
  if (dashIdx !== -1) return location.slice(dashIdx + 1).trim()
  return location.trim()
}

// extract the first https:// URL from a description string
function extractFirstUrl(description: string): string | null {
  const match = description.match(/https:\/\/[^\s\n\\]+/)
  return match ? match[0] : null
}

function inferType(description: string, summary: string, location: string): LMSDeadline['type'] {
  const all = `${description} ${summary} ${location}`.toLowerCase()
  if (all.includes('quiz') || all.includes('respondus')) return 'quiz'
  if (all.includes('discussion') || all.includes('forum')) return 'discussion'
  if (all.includes('final exam') || all.includes('midterm exam') || (all.includes('exam') && !all.includes('assignment'))) return 'exam'
  if (all.includes('dropbox') || all.includes('assignment') || all.includes('submission')) return 'assignment'
  return 'assignment'
}

// build a clean description showing course + type
function buildDescription(rawDesc: string, courseName: string): string {
  // strip HTML
  const clean = rawDesc.replace(/<[^>]+>/g, '').trim()
  // remove the deep link URLs from the description text (they're already in deeplinkUrl)
  const withoutUrls = clean.replace(/https?:\/\/[^\s\n]+/g, '').trim()
  // take just the first meaningful line
  const firstLine = withoutUrls.split('\n').find(l => l.trim().length > 2)?.trim() ?? ''
  return firstLine || courseName
}

function cleanText(text: string): string {
  return text.replace(/<[^>]+>/g, '').trim()
}
