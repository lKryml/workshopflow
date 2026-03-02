// ─── Enums / union types ───────────────────────────────────────────────────────

export type SessionType = 'workshop' | 'course'
export type ResourceType = 'link' | 'file' | 'embed'
export type FieldType = 'text' | 'url' | 'select'
export type StudentStatus = 'done' | 'working' | 'stuck' | 'idle'
export type ConnectionState = 'connected' | 'reconnecting' | 'offline'

export type Route =
  | 'instructor-auth'
  | 'instructor-home'
  | 'instructor-create'
  | 'instructor-dashboard'
  | 'student-join'
  | 'student-waiting'
  | 'student-view'

// ─── Database row types ────────────────────────────────────────────────────────

export type Session = {
  id: string
  title: string
  join_code: string
  is_active: boolean
  instructor_id: string | null
  session_type: SessionType
  description: string | null
  settings: Record<string, unknown>
  created_at: string
}

export type Task = {
  id: string
  session_id: string
  module_id: string | null
  title: string
  description: string | null
  task_order: number
  xp_reward: number
  is_locked: boolean
  created_at: string
}

export type Module = {
  id: string
  session_id: string
  title: string
  description: string | null
  module_order: number
  is_locked: boolean
  created_at: string
}

export type Student = {
  id: string
  session_id: string
  name: string
  avatar: string
  total_xp: number
  level: string // level name string e.g. 'Newbie', 'Hacker'
  streak: number
  email: string | null
  github_username: string | null
  phone: string | null
  custom_fields: Record<string, string>
  registered_at: string
  created_at: string
}

export type Completion = {
  id: string
  student_id: string
  task_id: string
  session_id: string
  is_stuck: boolean
  stuck_note: string | null
  time_bonus_xp: number
  completed_at: string
}

export type Instructor = {
  id: string
  display_name: string
  email: string
  created_at: string
}

export type SessionField = {
  id: string
  session_id: string
  field_key: string
  field_label: string
  field_type: FieldType
  is_required: boolean
  field_order: number
  options: string[]
}

export type Resource = {
  id: string
  session_id: string
  task_id: string | null
  module_id: string | null
  title: string
  resource_type: ResourceType
  url: string | null
  file_path: string | null
  description: string | null
  resource_order: number
  created_at: string
}

// ─── XP / Level types ─────────────────────────────────────────────────────────

export type Level = {
  name: string
  min: number
  color: string
  icon: string
}

export type XPProgress = {
  progress: number  // 0–100 percentage
  needed: number    // XP until next level (0 = max level)
  current: number   // XP accumulated within current level bracket
}

// ─── Derived / UI types ───────────────────────────────────────────────────────

export type HelpRequest = {
  student: Student
  completion: Completion
  taskTitle: string
}

// Instructor create session input shapes
export type TaskInput = {
  title: string
  description: string
  xp: number
}

export type ModuleInput = {
  title: string
  description: string
  tasks: TaskInput[]
}

export type SessionFieldInput = {
  field_key: string
  field_label: string
  field_type: FieldType
  is_required: boolean
  field_order: number
  options: string[]
}
