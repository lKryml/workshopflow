import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import type { Session, Task } from '../../types'

type SessionWithCount = Session & { student_count?: number }

export function InstructorHome({
  onNewWorkshop,
  onOpenSession,
}: {
  onNewWorkshop: () => void
  onOpenSession: (session: Session, tasks: Task[]) => void
}) {
  const [sessions, setSessions] = useState<SessionWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setSessions(data)
      setLoading(false)
    })
  }, [])

  const handleOpen = async (session: Session) => {
    const { data: tasks } = await supabase
      .from('tasks').select('*').eq('session_id', session.id).order('task_order')
    onOpenSession(session, tasks || [])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="bg-base bg-space" style={{ minHeight: '100vh' }}>
      <div className="top-bar">
        <span style={{ fontSize: 20 }}>⚡</span>
        <span className="gradient-text" style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>
          WorkshopFlow
        </span>
        <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h2 className="gradient-text" style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>
              Your Sessions
            </h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: 14 }}>
              Create or reopen a workshop or course.
            </p>
          </div>
          <button className="btn btn-primary" onClick={onNewWorkshop} style={{ fontSize: 15, padding: '12px 22px' }}>
            + New Session
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 48 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="glass" style={{
            border: '1px dashed var(--border-1)',
            padding: 56,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
            <p style={{ margin: 0, fontSize: 16 }}>No sessions yet. Create your first workshop!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className="glass glass-hover"
                style={{
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  animation: 'slide-in-up 0.4s ease',
                  animationDelay: `${i * 0.06}s`,
                  animationFillMode: 'both',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 16 }}>{s.title}</span>
                    <span className="code-display">{s.join_code}</span>
                    <span className={s.session_type === 'course' ? 'badge-cyan' : 'badge-brand'}>
                      {s.session_type === 'course' ? '📚 Course' : '🔧 Workshop'}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(s.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleOpen(s)}
                >
                  Open Dashboard →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
