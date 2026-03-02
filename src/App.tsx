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
        if (authSession) setRoute('instructor-home')
      })
      return () => subscription.unsubscribe()
    } else {
      // Restore student session from sessionStorage so refresh doesn't lose state
      try {
        const stored = sessionStorage.getItem('workshopflow_student')
        if (stored) {
          const { studentData, sessionData, tasksData, waitingRoom } = JSON.parse(stored)
          if (studentData && sessionData && tasksData) {
            setStudent(studentData)
            setSession(sessionData)
            setTasks(tasksData)
            setRoute(waitingRoom ? 'student-waiting' : 'student-view')
          }
        }
      } catch {
        sessionStorage.removeItem('workshopflow_student')
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStudentJoined = (s: Student, sess: Session, t: Task[]) => {
    setStudent(s)
    setSession(sess)
    setTasks(t)
    const inWaiting = !sess.is_active
    try {
      sessionStorage.setItem('workshopflow_student', JSON.stringify({
        studentData: s, sessionData: sess, tasksData: t, waitingRoom: inWaiting,
      }))
    } catch { /* storage unavailable */ }
    setRoute(inWaiting ? 'student-waiting' : 'student-view')
  }

  const handleSessionStart = () => {
    try {
      const stored = sessionStorage.getItem('workshopflow_student')
      if (stored) {
        const parsed = JSON.parse(stored)
        sessionStorage.setItem('workshopflow_student', JSON.stringify({ ...parsed, waitingRoom: false }))
      }
    } catch { /* ignore */ }
    setRoute('student-view')
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
  if (route === 'student-waiting' && student && session) return <WaitingRoom student={student} session={session} onSessionStart={handleSessionStart} />
  if (route === 'student-view' && student && session) return <StudentView student={student} session={session} initialTasks={tasks} />
  return <StudentJoin onJoined={handleStudentJoined} />
}
