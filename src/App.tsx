import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { InstructorAuth } from './pages/auth/InstructorAuth'
import { InstructorHome } from './pages/instructor/InstructorHome'
import { CreateSession } from './pages/instructor/CreateSession'
import { InstructorDashboard } from './pages/instructor/InstructorDashboard'
import { StudentJoin } from './pages/student/StudentJoin'
import { WaitingRoom } from './pages/student/WaitingRoom'
import { StudentView } from './pages/student/StudentView'
import type { Route, Session, Student, Task } from './types'

const isInstructor = window.location.pathname.startsWith('/instructor')

export default function App() {
  const [route, setRoute] = useState<Route>(isInstructor ? 'instructor-auth' : 'student-join')
  const [session, setSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [student, setStudent] = useState<Student | null>(null)

  useEffect(() => {
    if (isInstructor) {
      supabase.auth.getSession().then(({ data: { session: authSession } }) => {
        if (authSession) setRoute('instructor-home')
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
        if (authSession) setRoute(current => current === 'instructor-auth' ? 'instructor-home' : current)
      })
      return () => subscription.unsubscribe()
    } else {
      // Restore student session via Supabase auth — persists across tab closes
      supabase.auth.getSession().then(async ({ data: { session: authSession } }) => {
        if (!authSession?.user?.email) return

        const { data: studentRow } = await supabase
          .from('students')
          .select('*')
          .eq('email', authSession.user.email)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!studentRow) return

        const { data: sess } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', studentRow.session_id)
          .single()

        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .eq('session_id', studentRow.session_id)
          .order('task_order')

        setStudent(studentRow)
        setSession(sess)
        setTasks(tasksData || [])
        setRoute(sess?.is_active ? 'student-view' : 'student-waiting')
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStudentJoined = (s: Student, sess: Session, t: Task[]) => {
    setStudent(s)
    setSession(sess)
    setTasks(t)
    setRoute(!sess.is_active ? 'student-waiting' : 'student-view')
  }

  const handleSessionStart = () => {
    setRoute('student-view')
  }

  const handleStudentKicked = () => {
    setStudent(null)
    setSession(null)
    setTasks([])
    setRoute('student-join')
  }

  const handleSessionReady = (sess: Session, t: Task[]) => {
    setSession(sess)
    setTasks(t)
    setRoute('instructor-dashboard')
  }

  const handleOpenSession = (sess: Session, t: Task[]) => {
    setSession(sess)
    setTasks(t)
    setRoute('instructor-dashboard')
  }

  // ── Instructor flow ──
  if (isInstructor) {
    if (route === 'instructor-auth') return <InstructorAuth onAuth={() => setRoute('instructor-home')} onBack={() => { window.location.href = '/' }} />
    if (route === 'instructor-home') return <InstructorHome onNewWorkshop={() => setRoute('instructor-create')} onOpenSession={handleOpenSession} />
    if (route === 'instructor-create') return <CreateSession onSessionReady={handleSessionReady} />
    if (route === 'instructor-dashboard' && session) return <InstructorDashboard session={session} initialTasks={tasks} />
    return <InstructorAuth onAuth={() => setRoute('instructor-home')} onBack={() => { window.location.href = '/' }} />
  }

  // ── Student flow ──
  if (route === 'student-waiting' && student && session) return <WaitingRoom student={student} session={session} onSessionStart={handleSessionStart} onKicked={handleStudentKicked} />
  if (route === 'student-view' && student && session) return <StudentView student={student} session={session} initialTasks={tasks} />
  return <StudentJoin onJoined={handleStudentJoined} />
}
