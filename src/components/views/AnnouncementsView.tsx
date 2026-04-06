'use client'

// announcements view — shows all RSS feed posts from Brightspace courses
// users add one RSS URL per course (from the Brightspace news page)

import { useState, useEffect } from 'react'
import type { RSSAnnouncement } from '@/lib/adapters/rss'

interface Feed {
  id: string
  courseName: string
}

export function AnnouncementsView() {
  const [announcements, setAnnouncements] = useState<RSSAnnouncement[]>([])
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [feedInput, setFeedInput] = useState('')
  const [addingFeed, setAddingFeed] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/announcements')
      const data = await res.json()
      setAnnouncements(data.announcements ?? [])
      setFeeds(data.feeds ?? [])
    } catch {
      // silent fail
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!feedInput.trim()) return
    setAddingFeed(true)
    setAddError('')
    try {
      const res = await fetch('/api/announcements/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: feedInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error ?? 'Failed to add feed')
        return
      }
      setFeedInput('')
      setShowAddForm(false)
      loadAnnouncements()
    } catch {
      setAddError('Something went wrong')
    } finally {
      setAddingFeed(false)
    }
  }

  async function handleRemoveFeed(id: string) {
    await fetch(`/api/announcements/feeds?id=${id}`, { method: 'DELETE' })
    setFeeds(prev => prev.filter(f => f.id !== id))
    setAnnouncements(prev => prev.filter(a => a.feedId !== id))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Course Announcements
          </h2>
          {feeds.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {feeds.length} course{feeds.length !== 1 ? 's' : ''} · {announcements.length} post{announcements.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(prev => !prev)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: showAddForm ? 'var(--bg-hover)' : 'var(--accent)',
            color: showAddForm ? 'var(--text-secondary)' : 'white',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            {showAddForm
              ? <path d="M18 6 6 18M6 6l12 12" />
              : <path d="M12 5v14M5 12h14" />}
          </svg>
          {showAddForm ? 'Cancel' : 'Add Course Feed'}
        </button>
      </div>

      {/* add feed form */}
      {showAddForm && (
        <form
          onSubmit={handleAddFeed}
          className="rounded-xl p-4 border space-y-3"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              Brightspace Course RSS URL
            </p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              In Brightspace, open a course → Announcements → look for the RSS icon at the bottom of the page. Paste the URL here.
            </p>
            <input
              type="url"
              value={feedInput}
              onChange={e => setFeedInput(e.target.value)}
              placeholder="https://conestoga.desire2learn.com/d2l/le/news/rss/..."
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
              style={{
                background: 'var(--bg-base)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              required
            />
          </div>
          {addError && (
            <p className="text-xs" style={{ color: 'var(--urgent-critical)' }}>{addError}</p>
          )}
          <button
            type="submit"
            disabled={addingFeed || !feedInput.trim()}
            className="w-full py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            {addingFeed ? 'Verifying...' : 'Add Feed'}
          </button>
        </form>
      )}

      {/* no feeds yet */}
      {feeds.length === 0 && !showAddForm && (
        <div
          className="rounded-xl p-8 border text-center"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
        >
          <p className="text-2xl mb-2">📢</p>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            No announcement feeds yet
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Add your course RSS feeds to see announcements from all your Brightspace courses in one place.
          </p>
        </div>
      )}

      {/* active feeds list (manage) */}
      {feeds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {feeds.map(feed => (
            <div
              key={feed.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              <span>{feed.courseName}</span>
              <button
                onClick={() => handleRemoveFeed(feed.id)}
                className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"
                title="Remove feed"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* announcements list */}
      {announcements.length > 0 && (
        <div className="space-y-3">
          {announcements.map(item => (
            <div
              key={item.guid}
              className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
            >
              {/* announcement header — always visible */}
              <button
                className="w-full flex items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--bg-elevated)]"
                onClick={() => setExpanded(prev => (prev === item.guid ? null : item.guid))}
              >
                <span className="text-lg shrink-0 mt-0.5">📢</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)' }}
                    >
                      {item.courseName}
                    </span>
                    {item.pubDate && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(item.pubDate)}
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="shrink-0 mt-1 transition-transform"
                  style={{
                    color: 'var(--text-muted)',
                    transform: expanded === item.guid ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {/* expanded content */}
              {expanded === item.guid && (
                <div
                  className="px-4 pb-4 border-t"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div
                    className="prose-sm mt-3 text-sm leading-relaxed announcement-content"
                    style={{ color: 'var(--text-secondary)' }}
                    dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
                  />
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs transition-colors"
                      style={{ color: 'var(--accent)' }}
                    >
                      View on Brightspace
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatDate(date: Date): string {
  const diff = Date.now() - date.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}
