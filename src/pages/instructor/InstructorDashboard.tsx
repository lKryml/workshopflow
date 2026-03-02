import { useCallback, useState } from 'react'
import { ConnectionStatus } from '../../components/ConnectionStatus'
import { getStudentStatus, useInstructorSession } from '../../hooks/useInstructorSession'
import { getLevel } from '../../lib/xp'
import { copyToClipboard } from '../../lib/utils'
import { STATUS_COLOR, STATUS_ICON } from '../../constants'
import { ResourceModal } from './ResourceModal'
import type { Resource, Session, Task } from '../../types'

export function InstructorDashboard({
  session,
  initialTasks,
}: {
  session: Session
  initialTasks: Task[]
}) {
  const {
    tasks, students, completions, helpQueue, resources, isConnected,
    toggleLock, sendBroadcast, resolveHelp, addResource, removeResource, exportCSV,
  } = useInstructorSession(session.id, initialTasks)

  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastError, setBroadcastError] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)

  const handleSendBroadcast = useCallback(async () => {
    if (!broadcastMsg.trim()) return
    setBroadcastLoading(true)
    setBroadcastError('')
    // Bug #7: await send, Bug #9: only clear modal on success
    const ok = await sendBroadcast(broadcastMsg)
    setBroadcastLoading(false)
    if (ok) {
      setBroadcastMsg('')
      setShowBroadcast(false)
    } else {
      setBroadcastError('Failed to send. Check your connection and try again.')
    }
  }, [broadcastMsg, sendBroadcast])

  const handleCopyJoinLink = () => {
    copyToClipboard(session.join_code)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const sortedTasks = [...tasks].sort((a, b) => a.task_order - b.task_order)
  const currentTaskIdx = tasks.filter(t => !t.is_locked).length - 1
  const currentTask = tasks[currentTaskIdx] || tasks[0]
  const currentTaskCompletions = currentTask
    ? completions.filter(c => c.task_id === currentTask.id && !c.is_stuck)
    : []
  const completionPct = students.length > 0
    ? Math.round((currentTaskCompletions.length / students.length) * 100)
    : 0
  const sortedLeaderboard = [...students].sort((a, b) => b.total_xp - a.total_xp)

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a14',
      fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#e2e8f0',
    }}>
      <ConnectionStatus state={isConnected ? 'connected' : 'reconnecting'} />

      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, #1a0533, #0f0f2a)',
        borderBottom: '1px solid #1e1e35', padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>{session.title}</h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Instructor Dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{
            background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 12,
            padding: '8px 14px', display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ color: '#64748b', fontSize: 12 }}>JOIN CODE</span>
            <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, color: '#a78bfa' }}>{session.join_code}</span>
          </div>
          <button
            onClick={handleCopyJoinLink}
            style={{
              background: copyFeedback ? '#10b98133' : '#1e1e35',
              border: `1px solid ${copyFeedback ? '#10b98166' : '#2d2d50'}`,
              borderRadius: 10, padding: '8px 14px',
              color: copyFeedback ? '#10b981' : '#94a3b8',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            {copyFeedback ? '✅ Copied!' : '📋 Copy Code'}
          </button>
          <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 12, padding: '8px 16px', color: '#60a5fa', fontSize: 14, fontWeight: 600 }}>
            👥 {students.length} students
          </div>
          <button
            onClick={exportCSV}
            style={{
              background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 12,
              padding: '8px 14px', color: '#94a3b8', cursor: 'pointer', fontSize: 14, fontWeight: 600,
            }}
          >📤 Export CSV</button>
          <button
            onClick={() => { setShowBroadcast(true); setBroadcastError('') }}
            style={{
              background: 'linear-gradient(135deg,#ef4444,#f97316)', border: 'none',
              borderRadius: 12, padding: '10px 18px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
            }}
          >📢 Broadcast</button>
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div style={{
          position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 20, padding: 32, width: 420 }}>
            <h3 style={{ margin: '0 0 16px', color: '#e2e8f0' }}>📢 Broadcast to All Students</h3>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              placeholder="e.g. ⚠️ Stop here — wait for me before step 4"
              style={{
                width: '100%', height: 100, background: '#13131f', border: '1px solid #2d2d50',
                borderRadius: 12, color: '#e2e8f0', fontSize: 15, padding: 12, resize: 'none',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            {broadcastError && (
              <div style={{ background: '#ef444422', borderRadius: 8, padding: '8px 12px', color: '#fca5a5', fontSize: 13, marginTop: 8 }}>
                {broadcastError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={handleSendBroadcast}
                disabled={broadcastLoading || !broadcastMsg.trim()}
                style={{
                  flex: 1, padding: '12px',
                  background: broadcastLoading ? '#374151' : 'linear-gradient(135deg,#ef4444,#f97316)',
                  border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700,
                  cursor: broadcastLoading ? 'not-allowed' : 'pointer',
                }}
              >{broadcastLoading ? '⏳ Sending…' : 'Send 🚀'}</button>
              <button
                onClick={() => { setShowBroadcast(false); setBroadcastError('') }}
                style={{ padding: '12px 20px', background: '#374151', border: 'none', borderRadius: 12, color: '#94a3b8', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, maxWidth: 1400, margin: '0 auto' }}>
        {/* Main Content */}
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Done with step', value: `${currentTaskCompletions.length}/${students.length}`, icon: '✅', color: '#10b981' },
              { label: 'Need help', value: helpQueue.length, icon: '🆘', color: '#ef4444' },
              { label: 'Completion', value: `${completionPct}%`, icon: '📊', color: '#8b5cf6' },
              { label: 'Avg XP', value: students.length > 0 ? Math.round(students.reduce((a, s) => a + s.total_xp, 0) / students.length) : 0, icon: '⚡', color: '#f59e0b' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: '#1e1e35', border: `1px solid ${stat.color}33`, borderRadius: 16, padding: '16px 20px',
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          {currentTask && (
            <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                  Current Step: <span style={{ color: '#e2e8f0' }}>{currentTask.title}</span>
                </span>
                <span style={{ color: '#a78bfa', fontWeight: 700 }}>{completionPct}%</span>
              </div>
              <div style={{ height: 10, background: '#13131f', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, width: `${completionPct}%`,
                  background: 'linear-gradient(90deg,#7c3aed,#a78bfa)',
                  transition: 'width 0.6s ease', boxShadow: '0 0 12px #7c3aed88',
                }} />
              </div>
            </div>
          )}

          {/* Student Grid */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 12, letterSpacing: 1 }}>STUDENT STATUS</h3>
            {students.length === 0 ? (
              <div style={{
                background: '#1e1e35', border: '2px dashed #2d2d50', borderRadius: 16,
                padding: 48, textAlign: 'center', color: '#475569',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
                Waiting for students to join with code <strong style={{ color: '#a78bfa' }}>{session.join_code}</strong>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                {students.map(student => {
                  const status = getStudentStatus(student, tasks, completions)
                  const level = getLevel(student.total_xp)
                  const studentCompletions = completions.filter(c => c.student_id === student.id && !c.is_stuck)
                  const stuckComp = completions.find(c => c.student_id === student.id && c.is_stuck)
                  return (
                    <div key={student.id} style={{
                      background: `linear-gradient(135deg, ${STATUS_COLOR[status]}11, #1e1e35)`,
                      border: `1px solid ${STATUS_COLOR[status]}44`,
                      borderRadius: 16, padding: 16, transition: 'all 0.3s',
                      boxShadow: status === 'stuck' ? `0 0 16px ${STATUS_COLOR[status]}44` : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 28 }}>{student.avatar}</span>
                        <span style={{ fontSize: 18 }}>{STATUS_ICON[status]}</span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', marginBottom: 2 }}>{student.name}</div>
                      <div style={{ fontSize: 11, color: level.color, fontWeight: 600, marginBottom: 6 }}>{level.icon} {level.name}</div>
                      <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>⚡ {student.total_xp} XP</div>
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{studentCompletions.length}/{tasks.length} tasks</div>
                      {stuckComp?.stuck_note && (
                        <div style={{ marginTop: 8, background: '#ef444422', borderRadius: 8, padding: '4px 8px', color: '#fca5a5', fontSize: 11 }}>
                          💬 {stuckComp.stuck_note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Help Queue */}
          {helpQueue.length > 0 && (
            <div style={{ background: '#1e1e35', border: '1px solid #ef444433', borderRadius: 16, padding: 20, marginBottom: 20 }}>
              <h3 style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, marginBottom: 12, letterSpacing: 1 }}>
                🆘 HELP QUEUE ({helpQueue.length})
              </h3>
              {helpQueue.map((req, i) => (
                <div key={req.student.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: '#ef444411', borderRadius: 12, marginBottom: 8,
                }}>
                  <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 13 }}>#{i + 1}</span>
                  <span style={{ fontSize: 22 }}>{req.student.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{req.student.name}</div>
                    {req.completion.stuck_note && (
                      <div style={{ color: '#fca5a5', fontSize: 12 }}>{req.completion.stuck_note}</div>
                    )}
                  </div>
                  <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>⚡{req.student.total_xp}</div>
                  <button
                    onClick={() => resolveHelp(req.student.id, req.completion.task_id)}
                    style={{
                      background: '#10b98122', border: '1px solid #10b98144',
                      borderRadius: 8, padding: '6px 12px', color: '#10b981',
                      cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    }}
                  >✅ Resolve</button>
                </div>
              ))}
            </div>
          )}

          {/* Resources panel */}
          <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: 0, letterSpacing: 1 }}>📚 RESOURCES</h3>
              <button
                onClick={() => setShowResourceModal(true)}
                style={{
                  padding: '6px 14px', background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >+ Add</button>
            </div>
            {resources.length === 0 ? (
              <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                No resources yet. Add links, files, or embeds for students.
              </div>
            ) : (
              resources.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1a1a2e' }}>
                  <span style={{ flex: 1, color: '#e2e8f0', fontSize: 14 }}>{r.title}</span>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{r.resource_type}</span>
                  <button
                    onClick={() => removeResource(r.id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
                  >✕</button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task Control Panel */}
          <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16, padding: 20 }}>
            <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: '0 0 16px', letterSpacing: 1 }}>TASK CONTROL</h3>
            {sortedTasks.map(task => {
              const doneCount = completions.filter(c => c.task_id === task.id && !c.is_stuck).length
              return (
                <div key={task.id} style={{
                  background: task.is_locked ? '#13131f' : '#1a2a1a',
                  border: `1px solid ${task.is_locked ? '#2d2d50' : '#10b98133'}`,
                  borderRadius: 12, padding: '12px 14px', marginBottom: 10, transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                      <span style={{ color: '#64748b', fontWeight: 700, fontSize: 12 }}>{task.task_order}</span>
                      <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>{task.title}</span>
                    </div>
                    <button
                      onClick={() => toggleLock(task)}
                      style={{
                        background: task.is_locked ? '#374151' : '#10b98133',
                        border: `1px solid ${task.is_locked ? '#4b5563' : '#10b98166'}`,
                        borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                        color: task.is_locked ? '#9ca3af' : '#10b981', fontSize: 13,
                      }}
                    >{task.is_locked ? '🔒' : '🔓'}</button>
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>⚡ {task.xp_reward} XP</span>
                    <span style={{ color: '#64748b', fontSize: 11 }}>{doneCount}/{students.length} done</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Live Leaderboard */}
          <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16, padding: 20 }}>
            <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, margin: '0 0 16px', letterSpacing: 1 }}>🏆 LEADERBOARD</h3>
            {sortedLeaderboard.length === 0 ? (
              <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>No students yet</p>
            ) : sortedLeaderboard.map((s, i) => {
              const level = getLevel(s.total_xp)
              const medals = ['🥇', '🥈', '🥉']
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                  borderBottom: '1px solid #1a1a2e',
                }}>
                  <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{medals[i] || `${i + 1}`}</span>
                  <span style={{ fontSize: 22 }}>{s.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: level.color }}>{level.icon} {level.name}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 15 }}>⚡{s.total_xp}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {showResourceModal && (
        <ResourceModal
          sessionId={session.id}
          tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
          onAdd={resource => addResource(resource as Omit<Resource, 'id' | 'created_at' | 'resource_order'>)}
          onClose={() => setShowResourceModal(false)}
        />
      )}
    </div>
  )
}
