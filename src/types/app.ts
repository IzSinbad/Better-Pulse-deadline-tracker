// app-level types — stuff we pass around in the UI and API routes

import type { Deadline } from './database'

// the full course info we get from Brightspace
export interface Course {
  orgUnitId: number
  code: string
  name: string
  isActive: boolean
  // current grade as a percent (can be null if not graded yet)
  currentGrade: number | null
}

// deadline with extra computed stuff for the UI
export interface EnrichedDeadline extends Deadline {
  // how urgent is this? computed from due_at
  urgency: 'overdue' | 'critical' | 'high' | 'medium' | 'low'
  // ms until deadline (negative if overdue)
  msUntilDue: number
  // "Due in 2 days, 4 hours" style string
  timeUntilDueLabel: string
  // grade info for this course
  currentGrade: number | null
  targetGrade: number | null
  // what score do you need on this to hit your target?
  gradeNeededForTarget: number | null
  // what happens to your grade if you get 0?
  gradeIfZero: number | null
  // rough estimate of how long this might take
  estimatedHours: number | null
  // short summary of what the assignment is about
  summary: string | null
}

// what we send to the assistant as context
export interface AssistantContext {
  deadlines: EnrichedDeadline[]
  courses: Course[]
  currentDate: string
  upcomingThisWeek: EnrichedDeadline[]
  urgentItems: EnrichedDeadline[]
}

// message in the chat panel
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// the sync status shown in the sidebar
export interface SyncStatus {
  isSyncing: boolean
  lastSynced: Date | null
  error: string | null
}

// for the workload heatmap — one entry per day
export interface HeatmapDay {
  date: Date
  items: EnrichedDeadline[]
  // 0-4 intensity score for coloring
  intensity: 0 | 1 | 2 | 3 | 4
}

// urgency thresholds in hours — tune these if needed
export const URGENCY_THRESHOLDS = {
  critical: 24,   // < 24h = red
  high: 72,       // < 72h = orange
  medium: 168,    // < 7 days = yellow
  // anything beyond = green
} as const
