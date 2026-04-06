// ICS calendar feed adapter — gets all deadlines from Brightspace's built-in calendar export
// no OAuth, no API keys, no registration — just a URL the student copies from their calendar
// every D2L student has one of these, it's a standard feature

import type { LMSDeadline } from './base'

export interface ICalDeadline extends LMSDeadline {
  uid: string
}

// parse a Brightspace ICS feed URL and return all upcoming deadlines
export async function fetchICalDeadlines(feedUrl: string): Promise<ICalDeadline[]> {
  // fetch the raw ICS text
  const res = await fetch(feedUrl, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to fetch calendar feed: ${res.status} — double check the URL is correct`)
  }

  const icsText = await res.text()

  if (!icsText.includes('BEGIN:VCALENDAR')) {
    throw new Error('That URL didn\'t return a valid calendar file — make sure you copied the whole URL')
  }

  return parseICS(icsText)
}

// validate a feed URL before saving — just checks it's reachable and returns a calendar
export async function validateICalUrl(feedUrl: string): Promise<boolean> {
  try {
    const deadlines = await fetchICalDeadlines(feedUrl)
    return true
  } catch {
    return false
  }
}

// lightweight ICS parser — handles the D2L format specifically
// D2L ICS events look like:
//   BEGIN:VEVENT
//   SUMMARY:Assignment 1 - Introduction Essay
//   DTSTART:20250410T235900Z
//   DTEND:20250410T235900Z
//   DESCRIPTION:Course: COMM 1085\nType: Dropbox
//   URL:https://conestoga.desire2learn.com/d2l/...
//   CATEGORIES:COMM 1085 - Business Communications
//   UID:d2l-dropbox-12345@conestoga.desire2learn.com
//   END:VEVENT
function parseICS(icsText: string): ICalDeadline[] {
  const deadlines: ICalDeadline[] = []

  // split into individual events — handle both \r\n and \n line endings
  const normalized = icsText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // handle line folding (ICS wraps long lines with a space/tab on the next line)
  const unfolded = normalized.replace(/\n[ \t]/g, '')

  const eventBlocks = unfolded.split('BEGIN:VEVENT').slice(1)

  for (const block of eventBlocks) {
    try {
      const props = parseEventBlock(block)

      // skip events with no due date
      if (!props.dtstart) continue

      const dueDate = parseICSDate(props.dtstart)
      if (!dueDate) continue

      // skip past events (more than 1 day ago)
      if (dueDate.getTime() < Date.now() - 86400000) continue

      // figure out the item type from the description or UID
      const type = inferType(props.description ?? '', props.uid ?? '', props.summary ?? '')
      const courseCode = extractCourseCode(props.categories ?? '', props.description ?? '')
      const courseName = extractCourseName(props.categories ?? '')

      deadlines.push({
        uid: props.uid ?? `ical-${Date.now()}-${Math.random()}`,
        lmsId: `ical-${props.uid ?? Date.now()}`,
        courseCode,
        courseName,
        title: cleanSummary(props.summary ?? 'Untitled'),
        type,
        dueAt: dueDate,
        weightPercent: null, // ICS doesn't include weight — that's a limitation
        description: cleanDescription(props.description ?? ''),
        deeplinkUrl: props.url ?? null,
      })
    } catch {
      // skip malformed events silently — better to show most than crash on one
    }
  }

  // sort by due date ascending
  return deadlines.sort((a, b) =>
    (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0)
  )
}

// parse a single VEVENT block into a key-value map
function parseEventBlock(block: string): Record<string, string> {
  const props: Record<string, string> = {}
  const lines = block.split('\n')

  for (const line of lines) {
    if (line.startsWith('END:VEVENT')) break

    // handle property parameters like DTSTART;TZID=America/Toronto:...
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue

    const rawKey = line.slice(0, colonIdx).toLowerCase()
    const value = line.slice(colonIdx + 1).trim()

    // strip any parameters (everything after ;) from the key
    const key = rawKey.split(';')[0]

    // decode ICS escape sequences
    props[key] = value
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
  }

  return props
}

// parse ICS date formats: 20250410T235900Z or 20250410T235900 or 20250410
function parseICSDate(dateStr: string): Date | null {
  try {
    // strip any TZID parameter value that might have leaked through
    const clean = dateStr.split('\n')[0].trim()

    if (clean.length === 8) {
      // date only: 20250410
      return new Date(`${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T23:59:00Z`)
    }
    if (clean.length >= 15) {
      // datetime: 20250410T235900Z
      const y = clean.slice(0, 4)
      const mo = clean.slice(4, 6)
      const d = clean.slice(6, 8)
      const h = clean.slice(9, 11)
      const mi = clean.slice(11, 13)
      const s = clean.slice(13, 15)
      const isUtc = clean.endsWith('Z')
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}${isUtc ? 'Z' : ''}`)
    }
    return null
  } catch {
    return null
  }
}

// guess the item type from available fields
function inferType(description: string, uid: string, summary: string): LMSDeadline['type'] {
  const combined = `${description} ${uid} ${summary}`.toLowerCase()
  if (combined.includes('quiz') || combined.includes('quizzing')) return 'quiz'
  if (combined.includes('discussion') || combined.includes('forum')) return 'discussion'
  if (combined.includes('exam') || combined.includes('test') || combined.includes('midterm') || combined.includes('final')) return 'exam'
  if (combined.includes('dropbox') || combined.includes('assignment') || combined.includes('submission')) return 'assignment'
  return 'assignment' // default
}

// extract a short course code like "COMM 1085" from the categories field
function extractCourseCode(categories: string, description: string): string {
  // D2L categories usually look like "COMM 1085 - Business Communications"
  const match = categories.match(/([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/i)
  if (match) return match[1].toUpperCase()

  // try from description: "Course: COMM 1085"
  const descMatch = description.match(/course:\s*([A-Z]{2,6}\s*\d{3,4}[A-Z]?)/i)
  if (descMatch) return descMatch[1].toUpperCase()

  return categories.split('-')[0].trim() || 'Unknown'
}

// extract full course name
function extractCourseName(categories: string): string {
  if (!categories) return 'Unknown Course'
  // "COMM 1085 - Business Communications" → "Business Communications"
  const parts = categories.split(' - ')
  return parts.length > 1 ? parts.slice(1).join(' - ').trim() : categories.trim()
}

// clean up HTML tags and extra whitespace from summaries
function cleanSummary(summary: string): string {
  return summary.replace(/<[^>]+>/g, '').trim()
}

function cleanDescription(desc: string): string {
  if (!desc) return ''
  // strip HTML and trim
  return desc.replace(/<[^>]+>/g, '').trim().slice(0, 500)
}
