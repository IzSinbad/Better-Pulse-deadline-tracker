// these are just the shapes of our Supabase tables
// if you change the schema, update these too!

export interface User {
  id: string
  microsoft_user_id: string
  email: string
  display_name: string | null
  // stored encrypted — never log or expose these raw
  brightspace_token_encrypted: string | null
  anthropic_key_encrypted: string | null
  created_at: string
  last_login: string | null
}

export interface Session {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  device_hint: string | null
  created_at: string
}

export interface TargetGrade {
  id: string
  user_id: string
  course_code: string
  target_percent: number | null
  updated_at: string
}

export interface Preference {
  user_id: string
  dark_mode: boolean
  default_view: 'timeline' | 'calendar' | 'course' | 'urgent'
  confetti_enabled: boolean
  notification_lead_hours: number
  updated_at: string
}

export interface AnnouncementFeed {
  id: string
  user_id: string
  feed_url_encrypted: string
  course_name: string
  created_at: string
}

export interface Deadline {
  id: string
  user_id: string
  brightspace_id: string | null
  course_code: string | null
  course_name: string | null
  title: string
  type: 'assignment' | 'quiz' | 'discussion' | 'exam' | 'manual'
  due_at: string | null
  weight_percent: number | null
  description: string | null
  deeplink_url: string | null
  is_completed: boolean
  is_manual: boolean
  synced_at: string
}
