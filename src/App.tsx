import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Landing } from './pages/Landing'
import { InstructorAuth } from './pages/auth/InstructorAuth'
import { InstructorHome } from './pages/instructor/InstructorHome'
import { CreateSession } from './pages/instructor/CreateSession'
import { InstructorDashboard } from './pages/instructor/InstructorDashboard'
import { StudentJoin } from './pages/student/StudentJoin'
import { StudentView } from './pages/student/StudentView'
import type { Route, Session, Student, Task } from './types'

export default function App() {
  const [route, setRoute] = useState<Route>('landing')
  const [session, setSession] = useState<Session | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [student, setStudent] = useState<Student | null>(null)

  useEffect(() => {
    // Restore instructor auth session on page load
    supabase.auth.getSession().then(({ data: { session: authSession } }) => {
      if (authSession) setRoute('instructor-home')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (authSession) setRoute('instructor-home')
    })

    // Restore student session from sessionStorage so refresh doesn't lose state
    try {
      const stored = sessionStorage.getItem('workshopflow_student')
      if (stored) {
        const { studentData, sessionData, tasksData } = JSON.parse(stored)
        if (studentData && sessionData && tasksData) {
          setStudent(studentData)
          setSession(sessionData)
          setTasks(tasksData)
          setRoute('student-view')
        }
      }
    } catch {
      sessionStorage.removeItem('workshopflow_student')
    }

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStudentJoined = (s: Student, sess: Session, t: Task[]) => {
    setStudent(s)
    setSession(sess)
    setTasks(t)
    try {
      sessionStorage.setItem('workshopflow_student', JSON.stringify({
        studentData: s, sessionData: sess, tasksData: t,
      }))
    } catch { /* storage unavailable */ }
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

  if (route === 'landing') return <Landing onInstructor={() => setRoute('instructor-auth')} onStudent={() => setRoute('student-join')} />
  if (route === 'instructor-auth') return <InstructorAuth onAuth={() => setRoute('instructor-home')} />
  if (route === 'instructor-home') return <InstructorHome onNewWorkshop={() => setRoute('instructor-create')} onOpenSession={handleOpenSession} />
  if (route === 'instructor-create') return <CreateSession onSessionReady={handleSessionReady} />
  if (route === 'instructor-dashboard' && session) return <InstructorDashboard session={session} initialTasks={tasks} />
  if (route === 'student-join') return <StudentJoin onJoined={handleStudentJoined} />
  if (route === 'student-view' && student && session) return <StudentView student={student} session={session} initialTasks={tasks} />

  return <Landing onInstructor={() => setRoute('instructor-auth')} onStudent={() => setRoute('student-join')} />
}
