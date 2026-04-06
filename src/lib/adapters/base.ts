// base adapter interface — every LMS adapter (Brightspace, Canvas, Moodle etc.)
// implements this, so we can swap them out without touching the rest of the app

import type { Course } from '@/types/app'
import type { Deadline } from '@/types/database'

export interface LMSDeadline {
  lmsId: string
  courseCode: string
  courseName: string
  title: string
  type: 'assignment' | 'quiz' | 'discussion' | 'exam'
  dueAt: Date | null
  weightPercent: number | null
  description: string | null
  deeplinkUrl: string | null
}

// every LMS adapter needs to implement this
export interface LMSAdapter {
  // fetch all courses the student is enrolled in
  getCourses(): Promise<Course[]>

  // fetch all upcoming deadlines across all courses
  getDeadlines(courses: Course[]): Promise<LMSDeadline[]>

  // get the current grade for a specific course
  getCourseGrade(orgUnitId: number): Promise<number | null>

  // test if the token is still valid
  validateToken(): Promise<boolean>
}
