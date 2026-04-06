// RSS feed adapter for Brightspace course announcements
// feed format: standard RSS 2.0, channel title = "COURSE-CODE-Sec1-Name | Announcements"

export interface RSSAnnouncement {
  guid: string
  title: string
  descriptionHtml: string
  pubDate: Date | null
  link: string
  courseName: string
  feedId: string
}

export async function fetchRSSFeed(
  feedUrl: string,
  feedId: string
): Promise<{ courseName: string; items: RSSAnnouncement[] }> {
  const res = await fetch(feedUrl, { cache: 'no-store' })
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)

  const xml = await res.text()
  if (!xml.includes('<rss')) throw new Error('Not a valid RSS feed')

  return parseRSS(xml, feedId)
}

function parseRSS(xml: string, feedId: string): { courseName: string; items: RSSAnnouncement[] } {
  // channel title: "CLSC72000-26W-Sec1-Classical Civilization and the Global Present | Announcements"
  const channelTitle = extractBetween(xml, '<channel>', '</channel>')
  const rawTitle = extractTag(channelTitle, 'title') ?? 'Unknown Course'
  // strip the "| Announcements" suffix and the code prefix
  const courseName = parseCourseName(rawTitle)

  const items: RSSAnnouncement[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const title = decodeXMLEntities(extractTag(block, 'title') ?? '')
    const description = extractTag(block, 'description') ?? ''
    const pubDateStr = extractTag(block, 'pubDate')
    const link = extractTag(block, 'link') ?? ''
    const guid = extractTag(block, 'guid') ?? `rss-${feedId}-${Math.random()}`

    // description comes CDATA-wrapped or entity-encoded HTML — decode it
    const descHtml = decodeXMLEntities(description)

    items.push({
      guid,
      title,
      descriptionHtml: sanitizeHtml(descHtml),
      pubDate: pubDateStr ? new Date(pubDateStr) : null,
      link,
      courseName,
      feedId,
    })
  }

  return { courseName, items: items.sort((a, b) => (b.pubDate?.getTime() ?? 0) - (a.pubDate?.getTime() ?? 0)) }
}

// "CLSC72000-26W-Sec1-Classical Civilization and the Global Present | Announcements"
// → "Classical Civilization and the Global Present"
function parseCourseName(raw: string): string {
  const withoutSuffix = raw.replace(/\s*\|.*$/, '').trim()
  const secMatch = withoutSuffix.match(/^[^-]+-[^-]+-Sec\d+-(.+)$/i)
  if (secMatch) return secMatch[1].trim()
  return withoutSuffix
}

function extractBetween(str: string, open: string, close: string): string {
  const start = str.indexOf(open)
  const end = str.indexOf(close)
  if (start === -1 || end === -1) return ''
  return str.slice(start + open.length, end)
}

function extractTag(xml: string, tag: string): string | null {
  // handle both <tag>value</tag> and <![CDATA[value]]>
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = xml.match(regex)
  if (!match) return null
  const value = match[1]
  // strip CDATA wrapper if present
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/)
  return cdata ? cdata[1] : value
}

function decodeXMLEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#160;/g, '\u00a0')
}

// strip dangerous elements but keep basic formatting
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
}
