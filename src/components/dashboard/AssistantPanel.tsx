'use client'

// the right-side chat panel — students can ask questions about their deadlines
// streams responses in real time

import { useState, useRef, useEffect } from 'react'
import { useDeadlines } from '@/hooks/useDeadlines'
import type { ChatMessage, AssistantContext } from '@/types/app'
import { cn } from '@/lib/utils'
import { addDays } from 'date-fns'

const SUGGESTED_QUESTIONS = [
  'What do I have due this week?',
  'What\'s my heaviest day coming up?',
  'What\'s worth the most points?',
  'Am I missing anything urgent?',
  'What do I need to pass all my courses?',
]

export function AssistantPanel() {
  const { deadlines } = useDeadlines()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // auto-scroll to bottom when new messages come in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function buildContext(): AssistantContext {
    const now = new Date()
    const nextWeek = addDays(now, 7)
    const next3Days = addDays(now, 3)

    const upcomingThisWeek = deadlines.filter(d =>
      d.due_at && new Date(d.due_at) >= now && new Date(d.due_at) <= nextWeek
    )
    const urgentItems = deadlines.filter(d =>
      d.due_at && new Date(d.due_at) >= now && new Date(d.due_at) <= next3Days
    )

    // extract unique courses from deadlines
    const courseMap = new Map<string, { orgUnitId: number; code: string; name: string; isActive: boolean; currentGrade: number | null }>()
    for (const d of deadlines) {
      if (d.course_code && !courseMap.has(d.course_code)) {
        courseMap.set(d.course_code, {
          orgUnitId: 0,
          code: d.course_code,
          name: d.course_name ?? d.course_code,
          isActive: true,
          currentGrade: d.currentGrade,
        })
      }
    }

    return {
      deadlines,
      courses: Array.from(courseMap.values()),
      currentDate: now.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      upcomingThisWeek,
      urgentItems,
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)

    // add a placeholder assistant message that we'll stream into
    const assistantId = (Date.now() + 1).toString()
    setMessages(prev => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() },
    ])

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-6), // last 6 messages for context
          context: buildContext(),
        }),
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data) as { text: string }
              fullText += parsed.text
              // update the placeholder message with the streamed content
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantId ? { ...m, content: fullText } : m
                )
              )
            } catch {
              // skip bad chunks
            }
          }
        }
      }
    } catch (err) {
      console.error('Assistant error:', err)
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Something went wrong. Try again in a sec?' }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--text-primary)' }}>
      {/* header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            ✦
          </div>
          <span className="text-sm font-medium">Study Assistant</span>
          {isStreaming && (
            <span className="ml-auto flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: 'var(--accent)',
                    animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </span>
          )}
        </div>
      </div>

      {/* messages area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          // empty state — show suggested questions
          <div className="space-y-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Ask me anything about your deadlines, grades, or workload. Try:
            </p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-sm px-3 py-2 rounded-lg transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-elevated)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'rounded-tr-sm'
                    : 'rounded-tl-sm'
                )}
                style={{
                  background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-elevated)',
                  color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                }}
              >
                {msg.content || (
                  // blinking cursor while streaming
                  <span
                    className="inline-block w-1.5 h-4 rounded-sm"
                    style={{ background: 'var(--text-muted)', animation: 'pulse-dot 0.8s ease-in-out infinite' }}
                  />
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input area */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your deadlines..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-[var(--text-muted)] disabled:opacity-50"
            style={{ color: 'var(--text-primary)', maxHeight: '100px', overflowY: 'auto' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="shrink-0 p-1.5 rounded-lg transition-all disabled:opacity-40"
            style={{
              background: input.trim() && !isStreaming ? 'var(--accent)' : 'var(--bg-hover)',
              color: 'white',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}
