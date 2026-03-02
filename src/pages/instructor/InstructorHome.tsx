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
    <div style={{
      minHeight: '100vh', background: '#0a0a14',
      fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #1a0533, #0f0f2a)',
        borderBottom: '1px solid #1e1e35', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>⚡</span>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>WorkshopFlow</h1>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none', border: '1px solid #374151', borderRadius: 8,
            color: '#64748b', padding: '8px 14px', cursor: 'pointer', fontSize: 13,
          }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Your Sessions</h2>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Create or reopen a workshop or course.</p>
          </div>
          <button
            onClick={onNewWorkshop}
            style={{
              padding: '12px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              color: '#fff', fontWeight: 700, fontSize: 15,
              boxShadow: '0 4px 20px #7c3aed55',
            }}
          >
            + New Session
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#475569', padding: 48 }}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div style={{
            background: '#1e1e35', border: '2px dashed #2d2d50', borderRadius: 20,
            padding: 56, textAlign: 'center', color: '#475569',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
            <p style={{ margin: 0, fontSize: 16 }}>No sessions yet. Create your first workshop!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sessions.map(s => (
              <div
                key={s.id}
                style={{
                  background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16,
                  padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    <span style={{ color: '#a78bfa', fontWeight: 700, letterSpacing: 2, fontSize: 14 }}>{s.join_code}</span>
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                      {s.session_type === 'course' ? '📚 Course' : '🔧 Workshop'}
                    </span>
                    <span style={{ color: '#64748b', fontSize: 13 }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleOpen(s)}
                  style={{
                    padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    color: '#fff', fontWeight: 700, fontSize: 14,
                  }}
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
