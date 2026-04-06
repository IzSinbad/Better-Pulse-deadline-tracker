// POST /api/assistant
// the chat assistant — student sends a message, we add all their deadline context
// and send it to the language model, stream the response back

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateSession } from '@/lib/session'
import { supabaseServer } from '@/lib/supabase'
import { decrypt } from '@/lib/encryption'
import type { ChatMessage, AssistantContext } from '@/types/app'

const SYSTEM_PROMPT = `You are a friendly study assistant for a college student at Conestoga College.
You help them stay on top of their deadlines, understand their workload, and manage their grades.

Your personality:
- Friendly and encouraging — like a helpful older student who's been there
- Direct and honest — if they're falling behind, tell them clearly but kindly
- Practical — give actual advice, not vague encouragement
- Concise — students are busy, get to the point

You have access to their full list of upcoming deadlines and current grades.
When answering about deadlines, be specific — include course names, due dates, weights.
When asked about grade impact, use the provided calculations.

IMPORTANT: Never mention AI, machine learning, or that you're powered by any specific technology.
You're just the student's study assistant built into their deadline tracker.`

export async function POST(request: NextRequest) {
  const session = await validateSession()
  if (!session) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  let body: { message: string; history: ChatMessage[]; context: AssistantContext }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { message, history = [], context } = body

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // check if user has their own API key, otherwise use the app's key
  const { data: user } = await supabaseServer
    .from('users')
    .select('anthropic_key_encrypted')
    .eq('id', session.userId)
    .single()

  const apiKey = user?.anthropic_key_encrypted
    ? decrypt(user.anthropic_key_encrypted)
    : process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: 'No API key configured — add one in settings or set ANTHROPIC_API_KEY' },
      { status: 400 }
    )
  }

  const client = new Anthropic({ apiKey })

  // build the context block that goes at the top of the conversation
  const contextBlock = buildContextBlock(context)

  // convert our chat history to Anthropic message format
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: contextBlock,
    },
    {
      role: 'assistant',
      content: "Got it! I can see all your deadlines and grades. What would you like to know?",
    },
    // add conversation history (last 10 messages to keep token count reasonable)
    ...history.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    {
      role: 'user',
      content: message,
    },
  ]

  // stream the response so it feels snappy
  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  })

  // pipe the stream back to the client as SSE
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
          )
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

function buildContextBlock(context: AssistantContext): string {
  if (!context) return 'No deadline context available.'

  const { deadlines, courses, currentDate, upcomingThisWeek, urgentItems } = context

  const lines = [
    `Today is ${currentDate}.`,
    '',
    `=== COURSES (${courses.length}) ===`,
    ...courses.map(c =>
      `• ${c.code} — ${c.name}${c.currentGrade !== null ? ` | Grade: ${c.currentGrade.toFixed(1)}%` : ' | No grade yet'}`
    ),
    '',
    `=== UPCOMING DEADLINES (${deadlines.length} total) ===`,
    ...deadlines.slice(0, 50).map(d =>
      [
        `• [${d.urgency.toUpperCase()}] ${d.course_code}: ${d.title}`,
        `  Due: ${d.due_at ? new Date(d.due_at).toLocaleString() : 'No date'} (${d.timeUntilDueLabel})`,
        d.weight_percent ? `  Worth: ${d.weight_percent}% of final grade` : '',
        d.gradeNeededForTarget !== null
          ? `  Grade needed for target: ${d.gradeNeededForTarget}%`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    ),
    '',
    `=== URGENT (due < 72h): ${urgentItems.length} items ===`,
    `=== THIS WEEK: ${upcomingThisWeek.length} items ===`,
  ]

  return lines.join('\n')
}
