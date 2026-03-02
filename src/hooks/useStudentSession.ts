import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { getLevel } from '../lib/xp'
import type { Completion, Resource, Session, Student, Task } from '../types'

export type StudentSessionState = {
  session: Session | null
  student: Student | null
  tasks: Task[]
  completions: Completion[]
  leaderboard: Student[]
  resources: Resource[]
  isConnected: boolean
  broadcastMessage: string | null
}

export type StudentSessionActions = {
  completeTask: (task: Task) => Promise<void>
  markStuck: (taskId: string, note: string) => Promise<void>
  unmarkStuck: (taskId: string) => Promise<void>
  dismissBroadcast: () => void
}

export function useStudentSession(
  studentId: string,
  sessionId: string
): StudentSessionState & StudentSessionActions {
  const [session, setSession] = useState<Session | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [leaderboard, setLeaderboard] = useState<Student[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null)

  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Initial data load
    supabase.from('sessions').select('*').eq('id', sessionId).single()
      .then(({ data }) => data && setSession(data))

    supabase.from('students').select('*').eq('id', studentId).single()
      .then(({ data }) => data && setStudent(data))

    supabase.from('tasks').select('*').eq('session_id', sessionId).order('task_order')
      .then(({ data }) => data && setTasks(data))

    supabase.from('completions').select('*').eq('student_id', studentId)
      .then(({ data }) => data && setCompletions(data))

    supabase.from('students').select('*').eq('session_id', sessionId)
      .then(({ data }) => {
        if (!data) return
        setLeaderboard([...data].sort((a, b) => b.total_xp - a.total_xp || a.name.localeCompare(b.name)))
      })

    supabase.from('resources').select('*').eq('session_id', sessionId).order('resource_order')
      .then(({ data }) => data && setResources(data))

    // Realtime — all data changes
    const ch = supabase.channel(`student-${studentId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tasks', filter: `session_id=eq.${sessionId}` },
        ({ new: updated }) => {
          setTasks(prev => prev.map(t => t.id === updated.id ? updated as Task : t))
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'students', filter: `session_id=eq.${sessionId}` },
        ({ new: s }) => {
          // Bug #10: add new students to leaderboard
          setLeaderboard(prev =>
            [...prev, s as Student].sort((a, b) => b.total_xp - a.total_xp || a.name.localeCompare(b.name))
          )
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'students', filter: `session_id=eq.${sessionId}` },
        ({ new: s }) => {
          if ((s as Student).id === studentId) setStudent(s as Student)
          // Bug #11: sort by total_xp DESC, name ASC
          setLeaderboard(prev =>
            prev.map(existing => existing.id === s.id ? s as Student : existing)
              .sort((a, b) => b.total_xp - a.total_xp || a.name.localeCompare(b.name))
          )
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'completions', filter: `student_id=eq.${studentId}` },
        ({ new: c }) => {
          setCompletions(prev => {
            // avoid duplicates if we already set it optimistically
            if (prev.find(x => x.id === c.id)) return prev
            return [...prev, c as Completion]
          })
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'completions', filter: `student_id=eq.${studentId}` },
        ({ new: c }) => {
          setCompletions(prev => prev.map(x => x.id === c.id ? c as Completion : x))
        })
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resources', filter: `session_id=eq.${sessionId}` },
        ({ new: r }) => setResources(prev => [...prev, r as Resource]))
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'resources', filter: `session_id=eq.${sessionId}` },
        ({ old: r }) => setResources(prev => prev.filter(x => x.id !== r.id)))
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Broadcast channel for instructor messages
    const bch = supabase.channel(`broadcast-${sessionId}`)
      .on('broadcast', { event: 'instructor_message' }, ({ payload }) => {
        setBroadcastMessage(payload.message as string)
        if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
        broadcastTimerRef.current = setTimeout(() => setBroadcastMessage(null), 8000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
      supabase.removeChannel(bch)
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
    }
  }, [studentId, sessionId])

  // Bug #1: await DB before updating local state
  // Bug #2: update level alongside total_xp
  // Bug #12 & #18: use upsert to avoid unique constraint violations
  const completeTask = useCallback(async (task: Task) => {
    const already = completions.find(c => c.task_id === task.id && !c.is_stuck)
    if (already) return

    const currentStudent = student
    if (!currentStudent) return

    // Upsert completion (handles duplicate insert and stuck→done transition)
    const { data: comp, error } = await supabase
      .from('completions')
      .upsert(
        { student_id: studentId, task_id: task.id, session_id: sessionId, is_stuck: false, time_bonus_xp: 0 },
        { onConflict: 'student_id,task_id' }
      )
      .select()
      .single()

    if (error || !comp) return

    setCompletions(prev => {
      const without = prev.filter(c => c.task_id !== task.id)
      return [...without, comp as Completion]
    })

    const newXP = currentStudent.total_xp + task.xp_reward
    const newLevel = getLevel(newXP)

    // Bug #2: update level name (text) alongside total_xp
    await supabase.from('students')
      .update({ total_xp: newXP, level: newLevel.name })
      .eq('id', studentId)

    setStudent(prev => prev ? { ...prev, total_xp: newXP, level: newLevel.name } : prev)
  }, [completions, student, studentId, sessionId])

  // Bug #12 & #18: upsert for stuck too
  const markStuck = useCallback(async (taskId: string, note: string) => {
    const { data: comp, error } = await supabase
      .from('completions')
      .upsert(
        { student_id: studentId, task_id: taskId, session_id: sessionId, is_stuck: true, stuck_note: note, time_bonus_xp: 0 },
        { onConflict: 'student_id,task_id' }
      )
      .select()
      .single()

    if (error || !comp) return

    setCompletions(prev => {
      const without = prev.filter(c => c.task_id !== taskId)
      return [...without, comp as Completion]
    })
  }, [studentId, sessionId])

  const unmarkStuck = useCallback(async (taskId: string) => {
    const comp = completions.find(c => c.task_id === taskId && c.is_stuck)
    if (!comp) return

    const { error } = await supabase
      .from('completions')
      .update({ is_stuck: false, stuck_note: null })
      .eq('id', comp.id)

    if (!error) {
      setCompletions(prev =>
        prev.map(c => c.id === comp.id ? { ...c, is_stuck: false, stuck_note: null } : c)
      )
    }
  }, [completions])

  const dismissBroadcast = useCallback(() => {
    setBroadcastMessage(null)
    if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current)
  }, [])

  return {
    session, student, tasks, completions, leaderboard, resources, isConnected, broadcastMessage,
    completeTask, markStuck, unmarkStuck, dismissBroadcast,
  }
}
