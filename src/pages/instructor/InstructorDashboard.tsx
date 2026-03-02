import { useCallback, useState } from 'react'
import { ConnectionStatus } from '../../components/ConnectionStatus'
import { getStudentStatus, useInstructorSession } from '../../hooks/useInstructorSession'
import { getLevel } from '../../lib/xp'
import { copyToClipboard } from '../../lib/utils'
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
    const ok = await sendBroadcast(broadcastMsg)
    setBroadcastLoading(false)
    if (ok) {
      setBroadcastMsg('')
      setShowBroadcast(false)
    } else {
      setBroadcastError('Failed to send. Check your connection and try again.')
    }
  }, [broadcastMsg, sendBroadcast])

  const handleCopyCode = () => {
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
  const avgXP = students.length > 0
    ? Math.round(students.reduce((a, s) => a + s.total_xp, 0) / students.length)
    : 0

  return (
    <div className="bg-base bg-space" style={{ minHeight: '100vh' }}>
      <ConnectionStatus state={isConnected ? 'connected' : 'reconnecting'} />

      {/* Top Bar */}
      <div className="top-bar" style={{ flexWrap: 'wrap', gap: 10, height: 'auto', padding: '12px 24px' }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{session.title}</span>
        <span className="code-display">{session.join_code}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleCopyCode}
          style={copyFeedback ? { borderColor: 'rgba(16,185,129,0.5)', color: 'var(--green)' } : undefined}
        >
          {copyFeedback ? '✅ Copied!' : '📋 Copy'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>📤 Export</button>
        <span>
          <span className="badge-cyan" style={{ fontSize: 13 }}>👥 {students.length} students</span>
        </span>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-danger btn-sm"
          onClick={() => { setShowBroadcast(true); setBroadcastError('') }}
          style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}
        >
          📢 Broadcast
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ padding: '20px 24px 0', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Done with step', value: `${currentTaskCompletions.length}/${students.length}`, icon: '✅', color: 'var(--green)' },
            { label: 'Need help', value: helpQueue.length, icon: '🆘', color: 'var(--red)', glow: helpQueue.length > 0 },
            { label: 'Progress', value: `${completionPct}%`, icon: '📊', color: 'var(--brand-light)' },
            { label: 'Avg XP', value: avgXP.toLocaleString(), icon: '⚡', color: 'var(--amber)' },
          ].map((stat, i) => (
            <div
              key={i}
              className="glass-sm"
              style={{
                padding: '16px 18px',
                borderLeft: `3px solid ${stat.color}`,
                animation: stat.glow ? 'glow-pulse 1.8s ease-in-out infinite' : undefined,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{stat.label}</div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `color-mix(in srgb, ${stat.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ padding: '0 24px 40px', maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, alignItems: 'start' }}>

        {/* Left Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task Control */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-label">Task Control</div>
            {sortedTasks.map(task => {
              const doneCount = completions.filter(c => c.task_id === task.id && !c.is_stuck).length
              const isOn = !task.is_locked
              return (
                <div key={task.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--border-1)',
                }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: 12, width: 18, textAlign: 'right', flexShrink: 0 }}>
                    {task.task_order}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 13, fontWeight: 600,
                    color: isOn ? 'var(--text-primary)' : 'var(--text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {task.title}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, flexShrink: 0 }}>
                    {doneCount}/{students.length}
                  </span>
                  <span className="badge-amber" style={{ flexShrink: 0 }}>{task.xp_reward}</span>
                  {/* CSS Toggle */}
                  <div className="toggle" onClick={() => toggleLock(task)}>
                    <div className={`toggle-track ${isOn ? 'on' : 'off'}`}>
                      <div className={`toggle-thumb ${isOn ? 'on' : 'off'}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current Step Progress */}
          {currentTask && (
            <div className="glass" style={{ padding: 16 }}>
              <div className="section-label">Current Step</div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>{currentTask.title}</div>
              <div className="xp-track">
                <div
                  className="xp-fill"
                  style={{
                    width: `${completionPct}%`,
                    background: 'linear-gradient(90deg, var(--brand), var(--brand-light))',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{currentTaskCompletions.length} done</span>
                <span style={{ color: 'var(--brand-light)', fontWeight: 700, fontSize: 12 }}>{completionPct}%</span>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-label">🏆 Leaderboard</div>
            {sortedLeaderboard.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>No students yet</p>
            ) : sortedLeaderboard.slice(0, 8).map((s, i) => {
              const level = getLevel(s.total_xp)
              const medals = ['🥇', '🥈', '🥉']
              const isFirst = i === 0
              return (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 10, marginBottom: 4,
                  background: isFirst ? 'rgba(245,158,11,0.06)' : 'transparent',
                  border: isFirst ? '1px solid rgba(245,158,11,0.15)' : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{medals[i] || `${i + 1}`}</span>
                  <span style={{ fontSize: 18 }}>{s.avatar}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                    <div style={{ fontSize: 10, color: level.color }}>{level.icon} {level.name}</div>
                  </div>
                  <div className="xp-num" style={{ fontSize: 13 }}>⚡{s.total_xp}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Help Queue */}
          {helpQueue.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="section-label" style={{ color: 'var(--red)' }}>🆘 Help Queue ({helpQueue.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {helpQueue.map((req, i) => (
                  <div key={req.student.id} className="help-alert" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="badge-red">#{i + 1}</span>
                    <span style={{ fontSize: 22 }}>{req.student.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{req.student.name}</div>
                      {req.completion.stuck_note && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12, fontStyle: 'italic' }}>
                          "{req.completion.stuck_note}"
                        </div>
                      )}
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                        on: {req.taskTitle}
                      </div>
                    </div>
                    <div className="xp-num" style={{ fontSize: 13 }}>⚡{req.student.total_xp}</div>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => resolveHelp(req.student.id, req.completion.task_id)}
                    >
                      ✅ Resolve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Grid */}
          <div style={{ marginBottom: 20 }}>
            <div className="section-label">Student Status</div>
            {students.length === 0 ? (
              <div className="glass" style={{
                border: '1px dashed var(--border-1)',
                padding: 48, textAlign: 'center', color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                <div>Waiting for students to join with code{' '}
                  <span className="code-display">{session.join_code}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
                {students.map(student => {
                  const status = getStudentStatus(student, tasks, completions)
                  const level = getLevel(student.total_xp)
                  const doneCount = completions.filter(c => c.student_id === student.id && !c.is_stuck).length
                  const stuckComp = completions.find(c => c.student_id === student.id && c.is_stuck)
                  const dotClass = status === 'stuck' ? 'dot dot-stuck' : status === 'done' ? 'dot dot-live' : status === 'working' ? 'dot dot-working' : 'dot dot-idle'
                  return (
                    <div
                      key={student.id}
                      className="glass-sm glass-hover"
                      style={{
                        padding: '14px 14px',
                        position: 'relative',
                        animation: status === 'stuck' ? 'glow-pulse 1.8s ease-in-out infinite' : undefined,
                        borderColor: status === 'stuck' ? 'rgba(239,68,68,0.3)' : undefined,
                      }}
                    >
                      {/* Status dot */}
                      <div style={{ position: 'absolute', top: 10, right: 10 }} className={dotClass} />
                      <div style={{ fontSize: 30, marginBottom: 8 }}>{student.avatar}</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.name}
                      </div>
                      <div style={{ fontSize: 11, color: level.color, fontWeight: 600, marginBottom: 6 }}>
                        {level.icon} {level.name}
                      </div>
                      <div className="xp-num" style={{ fontSize: 13 }}>⚡{student.total_xp}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                        {doneCount}/{tasks.length} tasks
                      </div>
                      {stuckComp?.stuck_note && (
                        <div style={{
                          marginTop: 8, background: 'rgba(239,68,68,0.1)',
                          borderRadius: 6, padding: '4px 8px',
                          color: '#fca5a5', fontSize: 11,
                        }}>
                          💬 {stuckComp.stuck_note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Resources Panel */}
          <div className="glass" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="section-label" style={{ margin: 0 }}>📚 Resources</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowResourceModal(true)}>
                + Add
              </button>
            </div>
            {resources.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '8px 0' }}>
                No resources yet. Add links, files, or embeds.
              </div>
            ) : (
              resources.map(r => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0', borderBottom: '1px solid var(--border-1)',
                }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{r.title}</span>
                  <span className="badge-brand" style={{ fontSize: 10 }}>{r.resource_type}</span>
                  <button
                    onClick={() => removeResource(r.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="modal-overlay" onClick={() => setShowBroadcast(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="glass glass-raised" style={{ padding: 28 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>📢 Broadcast to All Students</h3>
              <textarea
                value={broadcastMsg}
                onChange={e => setBroadcastMsg(e.target.value)}
                placeholder="e.g. ⚠️ Stop here — wait for me before step 4"
                className="field-input"
                style={{ height: 100, resize: 'none', marginBottom: 8 }}
              />
              {broadcastError && <div className="error-box" style={{ marginBottom: 10 }}>{broadcastError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  className="btn btn-danger btn-full"
                  onClick={handleSendBroadcast}
                  disabled={broadcastLoading || !broadcastMsg.trim()}
                  style={{ padding: '12px' }}
                >
                  {broadcastLoading ? '⏳ Sending…' : 'Send 🚀'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setShowBroadcast(false); setBroadcastError('') }}
                  style={{ padding: '12px 20px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
