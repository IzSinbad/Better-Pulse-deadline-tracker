// tiny utility functions used everywhere in the app

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// combine tailwind classes without conflicts — used in basically every component
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// get the CSS class for an urgency level
export function urgencyClass(urgency: string): string {
  const map: Record<string, string> = {
    overdue: 'urgency-overdue',
    critical: 'urgency-critical',
    high: 'urgency-high',
    medium: 'urgency-medium',
    low: 'urgency-low',
  }
  return map[urgency] ?? 'urgency-low'
}

// get the strip color class for the left border of a deadline card
export function urgencyStripClass(urgency: string): string {
  const map: Record<string, string> = {
    overdue: 'urgency-strip-overdue',
    critical: 'urgency-strip-critical',
    high: 'urgency-strip-high',
    medium: 'urgency-strip-medium',
    low: 'urgency-strip-low',
  }
  return map[urgency] ?? 'urgency-strip-low'
}

// icon for each deadline type
export function deadlineTypeIcon(type: string): string {
  const map: Record<string, string> = {
    assignment: '📝',
    quiz: '📊',
    discussion: '💬',
    exam: '📋',
    manual: '✏️',
  }
  return map[type] ?? '📌'
}

// format a date to something readable like "Mon, Apr 7 at 11:59 PM"
export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return 'No due date'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// group an array of items by a key function
export function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}
