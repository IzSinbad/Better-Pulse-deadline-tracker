// D2L Brightspace adapter — talks to the Brightspace REST API
// Conestoga uses: https://learn.conestogac.on.ca/d2l/api/
//
// auth flow: Bearer token in Authorization header
// we get the token from the user on setup, store it encrypted, decrypt on use

import type { LMSAdapter, LMSDeadline } from './base'
import type { Course } from '@/types/app'

// current API version — check D2L docs if calls start failing
const API_VERSION = '1.51'
const LE_VERSION = '1.51'

export class BrightspaceAdapter implements LMSAdapter {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // strip trailing slash just in case
    this.token = token
  }

  private async fetch<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      // don't cache — we want fresh data every time
      cache: 'no-store',
    })

    if (res.status === 403) {
      throw new Error('Brightspace token is invalid or expired — needs re-auth')
    }
    if (res.status === 429) {
      throw new Error('Brightspace rate limit hit — slow down the syncing')
    }
    if (!res.ok) {
      throw new Error(`Brightspace API error: ${res.status} on ${path}`)
    }

    return res.json() as T
  }

  // test if the token works by hitting the whoami endpoint
  async validateToken(): Promise<boolean> {
    try {
      await this.fetch(`/d2l/api/lp/${API_VERSION}/users/whoami`)
      return true
    } catch {
      return false
    }
  }

  // get all the courses the student is enrolled in
  async getCourses(): Promise<Course[]> {
    interface D2LEnrollment {
      OrgUnit: {
        Id: number
        Code: string
        Name: string
        Type: { Id: number; Code: string }
      }
      Access: { IsActive: boolean }
    }
    interface D2LEnrollmentsPage {
      Items: D2LEnrollment[]
      PagingInfo: { Bookmark: string; HasMoreItems: boolean }
    }

    const courses: Course[] = []
    let bookmark = ''

    // D2L pages results, so we loop until we have everything
    do {
      const url = `/d2l/api/lp/${API_VERSION}/enrollments/myenrollments/?${bookmark ? `bookmark=${bookmark}&` : ''}orgUnitTypeId=3`
      const page = await this.fetch<D2LEnrollmentsPage>(url)

      for (const item of page.Items) {
        // type 3 = course offering, skip anything else (org units, departments etc)
        if (item.OrgUnit.Type.Id !== 3) continue

        const grade = await this.getCourseGrade(item.OrgUnit.Id)

        courses.push({
          orgUnitId: item.OrgUnit.Id,
          code: item.OrgUnit.Code || `COURSE-${item.OrgUnit.Id}`,
          name: item.OrgUnit.Name,
          isActive: item.Access.IsActive,
          currentGrade: grade,
        })
      }

      bookmark = page.PagingInfo.HasMoreItems ? page.PagingInfo.Bookmark : ''
    } while (bookmark)

    return courses
  }

  // get the current final grade for a course
  async getCourseGrade(orgUnitId: number): Promise<number | null> {
    try {
      interface D2LGrade {
        DisplayedGrade: string
        PointsNumerator: number
        PointsDenominator: number
        WeightedDenominator: number
        WeightedNumerator: number
      }
      const grade = await this.fetch<D2LGrade>(
        `/d2l/api/le/${LE_VERSION}/${orgUnitId}/grades/final/values/myGradeValue`
      )
      // calculate percentage
      if (grade.WeightedDenominator && grade.WeightedDenominator > 0) {
        return (grade.WeightedNumerator / grade.WeightedDenominator) * 100
      }
      return null
    } catch {
      // no grade yet, that's normal early in the semester
      return null
    }
  }

  // grab everything due across all courses
  async getDeadlines(courses: Course[]): Promise<LMSDeadline[]> {
    const allDeadlines: LMSDeadline[] = []

    // run all course fetches in parallel — much faster than sequential
    const courseResults = await Promise.allSettled(
      courses.filter(c => c.isActive).map(course =>
        this.getDeadlinesForCourse(course)
      )
    )

    for (const result of courseResults) {
      if (result.status === 'fulfilled') {
        allDeadlines.push(...result.value)
      }
      // silently skip courses that fail — one bad course shouldn't break everything
    }

    return allDeadlines
  }

  // fetch deadlines for a single course — assignments, quizzes, discussions
  private async getDeadlinesForCourse(course: Course): Promise<LMSDeadline[]> {
    const deadlines: LMSDeadline[] = []

    // fetch all three types in parallel
    const [assignments, quizzes, discussions] = await Promise.allSettled([
      this.getAssignments(course),
      this.getQuizzes(course),
      this.getDiscussions(course),
    ])

    if (assignments.status === 'fulfilled') deadlines.push(...assignments.value)
    if (quizzes.status === 'fulfilled') deadlines.push(...quizzes.value)
    if (discussions.status === 'fulfilled') deadlines.push(...discussions.value)

    return deadlines
  }

  private async getAssignments(course: Course): Promise<LMSDeadline[]> {
    interface D2LDropbox {
      Id: number
      Name: string
      DueDate: string | null
      TotalPoints: number | null
      Instructions: { Text: string } | null
    }
    interface D2LDropboxPage {
      Objects: D2LDropbox[]
      Next: string | null
    }

    const items: LMSDeadline[] = []
    let nextUrl: string | null =
      `/d2l/api/le/${LE_VERSION}/${course.orgUnitId}/dropbox/folders/`

    while (nextUrl) {
      const page = await this.fetch<D2LDropboxPage>(nextUrl)
      for (const f of page.Objects) {
        if (!f.DueDate) continue // skip ones with no due date
        items.push({
          lmsId: `assignment-${f.Id}`,
          courseCode: course.code,
          courseName: course.name,
          title: f.Name,
          type: 'assignment',
          dueAt: new Date(f.DueDate),
          weightPercent: null, // assignments don't expose weight directly in D2L
          description: f.Instructions?.Text ?? null,
          deeplinkUrl: `${this.baseUrl}/d2l/lms/dropbox/user/folder_submit_files.d2l?db=${f.Id}&grpid=0&isprv=0&bp=0&ou=${course.orgUnitId}`,
        })
      }
      nextUrl = page.Next
    }

    return items
  }

  private async getQuizzes(course: Course): Promise<LMSDeadline[]> {
    interface D2LQuiz {
      QuizId: number
      Name: string
      DueDate: string | null
      AllowedAttempts: number | null
      Description: { Text: string } | null
    }
    interface D2LQuizPage {
      Objects: D2LQuiz[]
      Next: string | null
    }

    const items: LMSDeadline[] = []
    let nextUrl: string | null =
      `/d2l/api/le/${LE_VERSION}/${course.orgUnitId}/quizzes/`

    while (nextUrl) {
      const page = await this.fetch<D2LQuizPage>(nextUrl)
      for (const q of page.Objects) {
        if (!q.DueDate) continue
        items.push({
          lmsId: `quiz-${q.QuizId}`,
          courseCode: course.code,
          courseName: course.name,
          title: q.Name,
          type: 'quiz',
          dueAt: new Date(q.DueDate),
          weightPercent: null,
          description: q.Description?.Text ?? null,
          deeplinkUrl: `${this.baseUrl}/d2l/lms/quizzing/user/quiz_summary.d2l?qi=${q.QuizId}&ou=${course.orgUnitId}`,
        })
      }
      nextUrl = page.Next
    }

    return items
  }

  private async getDiscussions(course: Course): Promise<LMSDeadline[]> {
    interface D2LForum {
      ForumId: number
      Name: string
      Topics: Array<{
        TopicId: number
        Name: string
        DueDate: string | null
        Description: { Text: string } | null
      }>
    }
    interface D2LForumPage {
      Objects: D2LForum[]
      Next: string | null
    }

    const items: LMSDeadline[] = []
    let nextUrl: string | null =
      `/d2l/api/le/${LE_VERSION}/${course.orgUnitId}/discussions/forums/`

    while (nextUrl) {
      const page = await this.fetch<D2LForumPage>(nextUrl)
      for (const forum of page.Objects) {
        for (const topic of forum.Topics ?? []) {
          if (!topic.DueDate) continue
          items.push({
            lmsId: `discussion-${topic.TopicId}`,
            courseCode: course.code,
            courseName: course.name,
            title: `${forum.Name}: ${topic.Name}`,
            type: 'discussion',
            dueAt: new Date(topic.DueDate),
            weightPercent: null,
            description: topic.Description?.Text ?? null,
            deeplinkUrl: `${this.baseUrl}/d2l/le/news/${course.orgUnitId}/topics/${topic.TopicId}/View`,
          })
        }
      }
      nextUrl = page.Next
    }

    return items
  }
}
