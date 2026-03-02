import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { getLevel } from '../lib/xp'
import { exportStudentsToCSV } from '../lib/utils'
import type { Completion, HelpRequest, Resource, Session, SessionField, Student, Task } from '../types'

export type InstructorSessionState = {
  session: Session | null
  tasks: Task[]
  students: Student[]
  completions: Completion[]
  helpQueue: HelpRequest[]
  resources: Resource[]
  sessionFields: SessionField[]
  isConnected: boolean
}

export type InstructorSessionActions = {
  toggleLock: (task: Task) => Promise<void>
  sendBroadcast: (message: string) => Promise<boolean>
  pingStudent: (studentId: string) => Promise<boolean>
  resolveHelp: (studentId: string, taskId: string) => Promise<void>
  addResource: (resource: Omit<Resource, 'id' | 'created_at' | 'resource_order'>) => Promise<void>
  removeResource: (resourceId: string) => Promise<void>
  exportCSV: () => void
  startSession: () => Promise<void>
  kickStudent: (studentId: string) => Promise<void>
}

export function useInstructorSession(
  sessionId: string,
  initialTasks: Task[]
): InstructorSessionState & InstructorSessionActions {
  const [session, setSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [students, setStudents] = useState<Student[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [sessionFields, setSessionFields] = useState<SessionField[]>([])
  const [isConnected, setIsConnected] = useState(true)

  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Fixed: show ALL stuck students across all tasks, not just the last unlocked task
  const helpQueue: HelpRequest[] = completions
    .filter(c => c.is_stuck)
    .map(c => {
      const studentObj = students.find(s => s.id === c.student_id)
      const taskObj = tasks.find(t => t.id === c.task_id)
      if (!studentObj || !taskObj) return null
      return { student: studentObj, completion: c, taskTitle: taskObj.title }
    })
    .filter((h): h is HelpRequest => h !== null)

  useEffect(() => {
    // Initial load
    supabase.from('sessions').select('*').eq('id', sessionId).single()
      .then(({ data }) => data && setSession(data))

    supabase.from('students').select('*').eq('session_id', sessionId)
      .then(({ data }) => data && setStudents(data))

    supabase.from('completions').select('*').eq('session_id', sessionId)
      .then(({ data }) => data && setCompletions(data))

    supabase.from('resources').select('*').eq('session_id', sessionId).order('resource_order')
      .then(({ data }) => data && setResources(data))

    supabase.from('session_fields').select('*').eq('session_id', sessionId).order('field_order')
      .then(({ data }) => data && setSessionFields(data))

    // Realtime subscriptions
    const ch = supabase.channel(`instructor-${sessionId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'students', filter: `session_id=eq.${sessionId}` },
        ({ new: s }) => setStudents(prev => [...prev.filter(x => x.id !== s.id), s as Student]))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'students', filter: `session_id=eq.${sessionId}` },
        ({ new: s }) => setStudents(prev => prev.map(x => x.id === s.id ? s as Student : x)))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'students', filter: `session_id=eq.${sessionId}` },
        ({ old: s }) => setStudents(prev => prev.filter(x => x.id !== (s as Student).id)))
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'completions', filter: `session_id=eq.${sessionId}` },
        ({ new: c }) => setCompletions(prev => [...prev.filter(x => x.id !== c.id), c as Completion]))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'completions', filter: `session_id=eq.${sessionId}` },
        ({ new: c }) => setCompletions(prev => prev.map(x => x.id === c.id ? c as Completion : x)))
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `session_id=eq.${sessionId}` },
        ({ new: t }) => setTasks(prev => prev.map(x => x.id === t.id ? t as Task : x)))
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resources', filter: `session_id=eq.${sessionId}` },
        ({ new: r }) => setResources(prev => [...prev, r as Resource]))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'resources', filter: `session_id=eq.${sessionId}` },
        ({ old: r }) => setResources(prev => prev.filter(x => x.id !== r.id)))
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

    // Broadcast channel for sending instructor messages
    broadcastChannelRef.current = supabase.channel(`broadcast-${sessionId}`)
    broadcastChannelRef.current.subscribe()

    return () => {
      supabase.removeChannel(ch)
      if (broadcastChannelRef.current) supabase.removeChannel(broadcastChannelRef.current)
    }
  }, [sessionId])

  // Bug #5: await DB, do NOT do optimistic update — let realtime subscription refresh state
  const toggleLock = useCallback(async (task: Task) => {
    await supabase.from('tasks').update({ is_locked: !task.is_locked }).eq('id', task.id)
    // No local state mutation here — realtime UPDATE event will update tasks state
  }, [])

  // Bug #7: await channel.send(), check return value
  // Bug #9: only clear modal state when result is 'ok' (caller checks return value)
  const sendBroadcast = useCallback(async (message: string): Promise<boolean> => {
    if (!broadcastChannelRef.current || !message.trim()) return false
    const result = await broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'instructor_message',
      payload: { message },
    })
    return result === 'ok'
  }, [])

  const pingStudent = useCallback(async (studentId: string): Promise<boolean> => {
    if (!broadcastChannelRef.current) return false
    const result = await broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'student_ping',
      payload: { student_id: studentId, message: 'مدرسك في الطريق ✓' },
    })
    return result === 'ok'
  }, [])

  const resolveHelp = useCallback(async (studentId: string, taskId: string) => {
    const comp = completions.find(c => c.student_id === studentId && c.task_id === taskId && c.is_stuck)
    if (!comp) return
    await supabase.from('completions')
      .update({ is_stuck: false, stuck_note: null })
      .eq('id', comp.id)
    // Realtime UPDATE event will refresh completions state
  }, [completions])

  const addResource = useCallback(async (resource: Omit<Resource, 'id' | 'created_at' | 'resource_order'>) => {
    const maxOrder = resources.reduce((m, r) => Math.max(m, r.resource_order), 0)
    await supabase.from('resources').insert({ ...resource, resource_order: maxOrder + 1 })
    // Realtime INSERT event will add to resources state
  }, [resources])

  const removeResource = useCallback(async (resourceId: string) => {
    await supabase.from('resources').delete().eq('id', resourceId)
    // Realtime DELETE event will remove from resources state
  }, [])

  const exportCSV = useCallback(() => {
    exportStudentsToCSV(students, completions, tasks, session?.title ?? 'session')
  }, [students, completions, tasks, session])

  const startSession = useCallback(async () => {
    await supabase.from('sessions').update({ is_active: true }).eq('id', sessionId)
  }, [sessionId])

  const kickStudent = useCallback(async (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId))
    await supabase.from('students').delete().eq('id', studentId)
  }, [])

  return {
    session, tasks, students, completions, helpQueue, resources, sessionFields, isConnected,
    toggleLock, sendBroadcast, pingStudent, resolveHelp, addResource, removeResource, exportCSV, startSession, kickStudent,
  }
}

// Helper used by InstructorDashboard to compute per-student status on a specific task
export function getStudentTaskStatus(
  studentId: string,
  taskId: string,
  completions: Completion[]
): 'done' | 'stuck' | 'available' | 'locked' {
  const comp = completions.find(c => c.student_id === studentId && c.task_id === taskId)
  if (!comp) return 'available'
  if (comp.is_stuck) return 'stuck'
  return 'done'
}

// Keep backward-compat — derives overall student status for the most advanced active task
export function getStudentStatus(
  student: Student,
  tasks: Task[],
  completions: Completion[]
): 'done' | 'working' | 'stuck' | 'idle' {
  const unlockedTasks = tasks.filter(t => !t.is_locked)
  const lastUnlocked = [...unlockedTasks].sort((a, b) => b.task_order - a.task_order)[0]
  if (!lastUnlocked) return 'idle'

  // Check if stuck on ANY task
  const anyStuck = completions.find(c => c.student_id === student.id && c.is_stuck)
  if (anyStuck) return 'stuck'

  const doneWithCurrent = completions.find(
    c => c.student_id === student.id && c.task_id === lastUnlocked.id && !c.is_stuck
  )
  return doneWithCurrent ? 'done' : 'working'
}

export function getLevelFromXP(xp: number) {
  return getLevel(xp)
}
