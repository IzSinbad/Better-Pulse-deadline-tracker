'use client'

// ticks every second and returns a formatted "Due in 2d 4h 31m" string
// the cards use this so the countdown is always live

import { useState, useEffect } from 'react'

export function useCountdown(dueDateStr: string | null): string {
  const [label, setLabel] = useState(() => computeLabel(dueDateStr))

  useEffect(() => {
    if (!dueDateStr) return

    const interval = setInterval(() => {
      setLabel(computeLabel(dueDateStr))
    }, 1000)

    return () => clearInterval(interval)
  }, [dueDateStr])

  return label
}

function computeLabel(dueDateStr: string | null): string {
  if (!dueDateStr) return 'No due date'

  const now = Date.now()
  const due = new Date(dueDateStr).getTime()
  const diff = due - now

  if (diff < 0) {
    const abs = Math.abs(diff)
    const hours = Math.floor(abs / (1000 * 60 * 60))
    if (hours < 1) return 'Overdue (< 1h ago)'
    if (hours < 24) return `Overdue by ${hours}h`
    const days = Math.floor(hours / 24)
    return `Overdue by ${days}d`
  }

  const totalSeconds = Math.floor(diff / 1000)
  const seconds = totalSeconds % 60
  const minutes = Math.floor(totalSeconds / 60) % 60
  const hours = Math.floor(totalSeconds / 3600) % 24
  const days = Math.floor(totalSeconds / 86400)

  if (days > 7) {
    return `${days}d`
  }
  if (days > 0) {
    return `${days}d ${hours}h`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}
