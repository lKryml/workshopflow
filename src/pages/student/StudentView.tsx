import { useCallback, useState } from 'react'
import { BroadcastBanner } from '../../components/BroadcastBanner'
import { Confetti } from '../../components/Confetti'
import { ConnectionStatus } from '../../components/ConnectionStatus'
import { LevelUpToast } from '../../components/LevelUpToast'
import { XPFloat } from '../../components/XPFloat'
import { useStudentSession } from '../../hooks/useStudentSession'
import { getLevel, xpToNextLevel } from '../../lib/xp'
import { toYouTubeEmbed } from '../../lib/utils'
import type { Level, Resource, Session, Student, Task } from '../../types'

type SidebarTab = 'leaderboard' | 'resources'

function ResourceItem({ resource }: { resource: Resource }) {
  const embedUrl = resource.resource_type === 'embed' && resource.url
    ? toYouTubeEmbed(resource.url) ?? resource.url
    : null

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{resource.title}</div>
      {resource.description && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{resource.description}</div>
      )}
      {resource.resource_type === 'link' && resource.url && (
        <a href={resource.url} target="_blank" rel="noopener noreferrer"
          style={{ color: '#60a5fa', fontSize: 13, wordBreak: 'break-all' }}>
          🔗 Open Link
        </a>
      )}
      {resource.resource_type === 'file' && resource.file_path && (
        <a href={resource.file_path} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--brand-light)', fontSize: 13 }}>
          📄 Download File
        </a>
      )}
      {embedUrl && (
        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden', marginTop: 6 }}>
          <iframe
            src={embedUrl}
            title={resource.title}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen
          />
        </div>
      )}
    </div>
  )
}

export function StudentView({
  student: initialStudent,
  session,
  initialTasks,
}: {
  student: Student
  session: Session
  initialTasks: Task[]
}) {
  const {
    student, tasks, completions, leaderboard, resources, isConnected, broadcastMessage,
    completeTask, markStuck, unmarkStuck, dismissBroadcast,
  } = useStudentSession(initialStudent.id, session.id)

  const currentStudent = student ?? initialStudent

  const [showConfetti, setShowConfetti] = useState(false)
  const [showXP, setShowXP] = useState(false)
  const [lastXP, setLastXP] = useState(0)
  const [levelUpLevel, setLevelUpLevel] = useState<Level | null>(null)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)
  const [stuckTaskId, setStuckTaskId] = useState<string | null>(null)
  const [stuckNote, setStuckNote] = useState('')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('leaderboard')

  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : [initialStudent]
  const displayTasks = tasks.length > 0 ? tasks : initialTasks

  const handleComplete = useCallback(async (task: Task) => {
    const prevLevel = getLevel(currentStudent.total_xp)
    await completeTask(task)
    const newXP = currentStudent.total_xp + task.xp_reward
    const newLevel = getLevel(newXP)
    setLastXP(task.xp_reward)
    setShowXP(true)
    setShowConfetti(true)
    setJustCompleted(task.id)
    setTimeout(() => {
      setShowXP(false)
      setShowConfetti(false)
      setJustCompleted(null)
    }, 800)
    if (newLevel.min > prevLevel.min) {
      setLevelUpLevel(newLevel)
    }
  }, [currentStudent.total_xp, completeTask])

  const handleStuckSubmit = useCallback(async () => {
    if (!stuckTaskId) return
    await markStuck(stuckTaskId, stuckNote)
    setStuckTaskId(null)
    setStuckNote('')
  }, [stuckTaskId, stuckNote, markStuck])

  const sortedTasks = [...displayTasks].sort((a, b) => a.task_order - b.task_order)
  const doneCount = completions.filter(c => !c.is_stuck).length
  const level = getLevel(currentStudent.total_xp)
  const { progress, needed } = xpToNextLevel(currentStudent.total_xp)
  const rank = displayLeaderboard.findIndex(s => s.id === currentStudent.id) + 1

  const currentTask = sortedTasks.find(t => !t.is_locked && !completions.find(c => c.task_id === t.id && !c.is_stuck))
  const taskResources = currentTask ? resources.filter(r => r.task_id === currentTask.id) : []
  const sessionResources = resources.filter(r => r.task_id === null)

  return (
    <div className="bg-base bg-space" style={{ minHeight: '100vh' }}>
      <ConnectionStatus state={isConnected ? 'connected' : 'reconnecting'} />
      <Confetti trigger={showConfetti} />
      <XPFloat xp={lastXP} show={showXP} />
      <BroadcastBanner message={broadcastMessage} onDismiss={dismissBroadcast} />
      <LevelUpToast level={levelUpLevel} onDismiss={() => setLevelUpLevel(null)} />

      {/* Stuck Modal */}
      {stuckTaskId && (
        <div className="modal-overlay">
          <div className="modal-panel">
            <div className="glass glass-raised" style={{ padding: 28 }}>
              <h3 style={{ margin: '0 0 8px', color: '#fca5a5', fontSize: 18 }}>🆘 Ask for help</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 16px' }}>
                Tell your instructor what went wrong (optional):
              </p>
              <textarea
                value={stuckNote}
                onChange={e => setStuckNote(e.target.value)}
                placeholder="e.g. permission denied error…"
                className="field-input"
                style={{ height: 80, resize: 'none', marginBottom: 14 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-danger btn-full" onClick={handleStuckSubmit} style={{ padding: '12px' }}>
                  Send Help Request
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setStuckTaskId(null); setStuckNote('') }}
                  style={{ padding: '12px 16px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        {/* Profile Hero */}
        <div className="glass glass-raised" style={{ padding: '24px 28px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 40, boxShadow: '0 0 32px rgba(124,58,237,0.5)',
              }}>{currentStudent.avatar}</div>
              <div style={{
                position: 'absolute', bottom: -4, right: -4, fontSize: 16,
                background: 'var(--bg-base)', borderRadius: 8, padding: '2px 4px',
              }}>{level.icon}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{currentStudent.name}</h2>
                {rank > 0 && (
                  <span className="badge-amber">#{rank} on leaderboard</span>
                )}
              </div>
              <div style={{ color: level.color, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                {level.icon} {level.name}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', maxWidth: 280 }}>
                <div className="xp-track" style={{ flex: 1 }}>
                  <div
                    className="xp-fill"
                    style={{
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${level.color}, var(--brand-light))`,
                    }}
                  />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, flexShrink: 0 }}>
                  {needed > 0 ? `${needed} XP to next` : 'MAX LEVEL 🔥'}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="xp-num" style={{ fontSize: 32 }}>⚡{currentStudent.total_xp.toLocaleString()}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total XP</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                {doneCount}/{displayTasks.length} tasks
              </div>
            </div>
          </div>
        </div>

        <div className="student-grid">
          {/* Task Checklist */}
          <div>
            <div className="section-label">
              {session.session_type === 'course' ? 'Course Tasks' : 'Workshop Tasks'}
            </div>
            {sortedTasks.map((task, i) => {
              const isCompleted = !!completions.find(c => c.task_id === task.id && !c.is_stuck)
              const isStuck = !!completions.find(c => c.task_id === task.id && c.is_stuck)
              const isAvailable = !task.is_locked
              const isFlashing = justCompleted === task.id

              return (
                <div key={task.id} className="glass-sm" style={{
                  padding: '20px 22px', marginBottom: 12,
                  opacity: task.is_locked && !isCompleted ? 0.4 : 1,
                  transition: 'all 0.3s',
                  borderColor: isCompleted ? 'rgba(16,185,129,0.3)' : isStuck ? 'rgba(239,68,68,0.3)' : undefined,
                  background: isCompleted ? 'rgba(16,185,129,0.04)' : undefined,
                  animation: isFlashing ? 'task-complete-flash 0.6s ease' : isStuck ? 'glow-pulse 1.8s ease-in-out infinite' : undefined,
                }}>
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 11, flexShrink: 0, marginTop: 2,
                      background: isCompleted
                        ? 'var(--green)'
                        : task.is_locked ? 'var(--text-muted)' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                      boxShadow: isCompleted ? 'var(--glow-green)' : task.is_locked ? 'none' : 'var(--glow-brand)',
                    }}>
                      {isCompleted ? '✅' : task.is_locked ? '🔒' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <h4 style={{
                          margin: 0, fontSize: 15, fontWeight: 700,
                          color: isCompleted ? 'var(--green)' : 'var(--text-primary)',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}>{task.title}</h4>
                        <span className="badge-amber" style={{ marginLeft: 8, flexShrink: 0 }}>⚡ {task.xp_reward}</span>
                      </div>
                      {task.description && (
                        <p style={{ margin: '0 0 10px', color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                          {task.description}
                        </p>
                      )}
                      {!isCompleted && !isStuck && isAvailable && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleComplete(task)}
                          >✅ Mark as Done</button>
                          <button
                            className="btn btn-sm"
                            onClick={() => setStuckTaskId(task.id)}
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.3)',
                              color: '#fca5a5',
                            }}
                          >🆘 I'm Stuck</button>
                        </div>
                      )}
                      {isStuck && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{
                            background: 'rgba(239,68,68,0.1)', borderRadius: 8,
                            padding: '8px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 8,
                          }}>
                            🆘 Help requested — your instructor is on the way!
                          </div>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => unmarkStuck(task.id)}
                          >✓ I'm no longer stuck</button>
                        </div>
                      )}
                      {isCompleted && (
                        <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                          ✨ Completed!
                        </div>
                      )}
                      {task.is_locked && !isCompleted && (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                          🔒 Locked — wait for your instructor to unlock this step
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 24 }}>
            {/* Tab pill */}
            <div className="glass" style={{ display: 'flex', padding: 4, borderRadius: 12, marginBottom: 12 }}>
              {(['leaderboard', 'resources'] as SidebarTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 10,
                    background: sidebarTab === tab ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                    color: sidebarTab === tab ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700, fontSize: 13,
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {tab === 'leaderboard' ? '🏆 Leaderboard' : '📚 Resources'}
                </button>
              ))}
            </div>

            <div className="glass" style={{ padding: 16 }}>
              {sidebarTab === 'leaderboard' ? (
                <>
                  {displayLeaderboard.slice(0, 8).map((s, i) => {
                    const isMe = s.id === currentStudent.id
                    const lvl = getLevel(s.total_xp)
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        borderRadius: 10, marginBottom: 4, transition: 'all 0.2s',
                        background: isMe
                          ? 'rgba(124,58,237,0.12)'
                          : i === 0 ? 'rgba(245,158,11,0.06)' : 'transparent',
                        border: isMe ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                      }}>
                        <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
                          {medals[i] || `${i + 1}`}
                        </span>
                        <span style={{ fontSize: 18 }}>{s.avatar}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: isMe ? 800 : 600, fontSize: 13,
                            color: isMe ? 'var(--brand-light)' : 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{s.name}{isMe ? ' (you)' : ''}</div>
                          <div style={{ fontSize: 10, color: lvl.color }}>{lvl.icon} {lvl.name}</div>
                        </div>
                        <div className="xp-num" style={{ fontSize: 13 }}>⚡{s.total_xp}</div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div>
                  {taskResources.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: 'var(--brand-light)', fontSize: 11, fontWeight: 700, marginBottom: 10, letterSpacing: 0.1 }}>
                        📌 FOR THIS TASK
                      </div>
                      {taskResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                  {sessionResources.length > 0 && (
                    <div>
                      <div className="section-label">Session Resources</div>
                      {sessionResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                  {taskResources.length === 0 && sessionResources.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>
                      No resources yet. Your instructor will add them here.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
