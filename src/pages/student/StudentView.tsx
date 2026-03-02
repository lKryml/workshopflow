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
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14, marginBottom: 4 }}>{resource.title}</div>
      {resource.description && <div style={{ color: '#64748b', fontSize: 12, marginBottom: 6 }}>{resource.description}</div>}
      {resource.resource_type === 'link' && resource.url && (
        <a href={resource.url} target="_blank" rel="noopener noreferrer"
          style={{ color: '#60a5fa', fontSize: 13, wordBreak: 'break-all' }}>
          🔗 Open Link
        </a>
      )}
      {resource.resource_type === 'file' && resource.file_path && (
        <a href={resource.file_path} target="_blank" rel="noopener noreferrer"
          style={{ color: '#a78bfa', fontSize: 13 }}>
          📄 Download File
        </a>
      )}
      {embedUrl && (
        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 8, overflow: 'hidden', marginTop: 4 }}>
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
  const [stuckTaskId, setStuckTaskId] = useState<string | null>(null)
  const [stuckNote, setStuckNote] = useState('')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('leaderboard')

  // Seed leaderboard with initial student when hook hasn't loaded yet
  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : [initialStudent]

  // Seed tasks from initialTasks until hook loads
  const displayTasks = tasks.length > 0 ? tasks : initialTasks

  const handleComplete = useCallback(async (task: Task) => {
    const prevLevel = getLevel(currentStudent.total_xp)
    await completeTask(task)
    const newXP = currentStudent.total_xp + task.xp_reward
    const newLevel = getLevel(newXP)
    setLastXP(task.xp_reward)
    setShowXP(true)
    setShowConfetti(true)
    setTimeout(() => { setShowXP(false); setShowConfetti(false) }, 2000)
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

  // For resources panel: which task is the student currently on?
  const currentTask = sortedTasks.find(t => !t.is_locked && !completions.find(c => c.task_id === t.id && !c.is_stuck))
  const taskResources = currentTask ? resources.filter(r => r.task_id === currentTask.id) : []
  const sessionResources = resources.filter(r => r.task_id === null)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0a0a14 0%, #1a0533 50%, #0a0a14 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif", color: '#e2e8f0',
    }}>
      <ConnectionStatus state={isConnected ? 'connected' : 'reconnecting'} />
      <Confetti trigger={showConfetti} />
      <XPFloat xp={lastXP} show={showXP} />
      <BroadcastBanner message={broadcastMessage} onDismiss={dismissBroadcast} />
      <LevelUpToast level={levelUpLevel} onDismiss={() => setLevelUpLevel(null)} />

      {/* Stuck Modal */}
      {stuckTaskId && (
        <div style={{
          position: 'fixed', inset: 0, background: '#00000099', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#1e1e35', border: '1px solid #ef444433', borderRadius: 20, padding: 28, width: 360 }}>
            <h3 style={{ margin: '0 0 8px', color: '#fca5a5' }}>🆘 Ask for help</h3>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 16px' }}>Tell your instructor what went wrong (optional):</p>
            <textarea
              value={stuckNote}
              onChange={e => setStuckNote(e.target.value)}
              placeholder="e.g. permission denied error…"
              style={{
                width: '100%', height: 80, background: '#13131f', border: '1px solid #2d2d50',
                borderRadius: 10, color: '#e2e8f0', fontSize: 14, padding: 10, resize: 'none',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button
                onClick={handleStuckSubmit}
                style={{
                  flex: 1, padding: '12px',
                  background: 'linear-gradient(135deg,#ef4444,#f97316)',
                  border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer',
                }}
              >Send Help Request</button>
              <button
                onClick={() => { setStuckTaskId(null); setStuckNote('') }}
                style={{ padding: '12px 16px', background: '#374151', border: 'none', borderRadius: 10, color: '#94a3b8', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
        {/* Profile Card */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1e35, #2d1b4e)',
          border: '1px solid #3d2d6e', borderRadius: 24, padding: 24, marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, boxShadow: '0 0 24px #7c3aed66',
            }}>{currentStudent.avatar}</div>
            <div style={{
              position: 'absolute', bottom: -4, right: -4, fontSize: 18,
              background: '#1e1e35', borderRadius: 8, padding: '2px 4px',
            }}>{level.icon}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{currentStudent.name}</h2>
              {rank > 0 && (
                <span style={{
                  background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44',
                  borderRadius: 8, padding: '2px 8px', fontSize: 12, fontWeight: 700,
                }}>#{rank} on leaderboard</span>
              )}
            </div>
            <div style={{ color: level.color, fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{level.icon} {level.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <div style={{ height: 8, flex: 1, background: '#13131f', borderRadius: 99, overflow: 'hidden', maxWidth: 240 }}>
                <div style={{
                  height: '100%', width: `${progress}%`, borderRadius: 99,
                  background: `linear-gradient(90deg, ${level.color}, #a78bfa)`, transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ color: '#64748b', fontSize: 12 }}>
                {needed > 0 ? `${needed} XP to next level` : 'MAX LEVEL 🔥'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>⚡{currentStudent.total_xp}</div>
            <div style={{ color: '#64748b', fontSize: 12 }}>Total XP</div>
            <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>{doneCount}/{displayTasks.length} tasks</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
          {/* Task Checklist */}
          <div>
            <h3 style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, marginBottom: 16, letterSpacing: 1 }}>
              {session.session_type === 'course' ? 'COURSE TASKS' : 'WORKSHOP TASKS'}
            </h3>
            {sortedTasks.map((task, i) => {
              const isCompleted = !!completions.find(c => c.task_id === task.id && !c.is_stuck)
              const isStuck = !!completions.find(c => c.task_id === task.id && c.is_stuck)
              const isAvailable = !task.is_locked

              return (
                <div key={task.id} style={{
                  background: isCompleted ? 'linear-gradient(135deg,#10b98111,#1e1e35)' : task.is_locked ? '#13131f' : '#1e1e35',
                  border: `1px solid ${isCompleted ? '#10b98144' : isStuck ? '#ef444444' : task.is_locked ? '#1a1a2e' : '#2d2d50'}`,
                  borderRadius: 16, padding: 20, marginBottom: 12, transition: 'all 0.3s',
                  opacity: task.is_locked && !isCompleted ? 0.5 : 1,
                }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0, marginTop: 2,
                      background: isCompleted ? '#10b981' : task.is_locked ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, boxShadow: isCompleted ? '0 0 16px #10b98166' : task.is_locked ? 'none' : '0 0 16px #7c3aed44',
                    }}>
                      {isCompleted ? '✅' : task.is_locked ? '🔒' : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{
                          margin: '0 0 4px', fontSize: 16, fontWeight: 700,
                          color: isCompleted ? '#10b981' : '#e2e8f0',
                          textDecoration: isCompleted ? 'line-through' : 'none',
                        }}>{task.title}</h4>
                        <span style={{
                          background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b33',
                          borderRadius: 8, padding: '2px 8px', fontSize: 12, fontWeight: 700, flexShrink: 0, marginLeft: 8,
                        }}>⚡ {task.xp_reward} XP</span>
                      </div>
                      {task.description && (
                        <p style={{ margin: '0 0 12px', color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{task.description}</p>
                      )}
                      {!isCompleted && !isStuck && isAvailable && (
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                          <button
                            onClick={() => handleComplete(task)}
                            style={{
                              padding: '10px 20px', background: 'linear-gradient(135deg,#10b981,#059669)',
                              border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700,
                              cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 16px #10b98144',
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                          >✅ Mark as Done</button>
                          <button
                            onClick={() => setStuckTaskId(task.id)}
                            style={{
                              padding: '10px 14px', background: '#ef444422', border: '1px solid #ef444444',
                              borderRadius: 10, color: '#fca5a5', fontWeight: 600, cursor: 'pointer', fontSize: 14,
                            }}
                          >🆘 I'm Stuck</button>
                        </div>
                      )}
                      {isStuck && (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ background: '#ef444422', borderRadius: 10, padding: '8px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 8 }}>
                            🆘 Help requested — your instructor is on the way!
                          </div>
                          <button
                            onClick={() => unmarkStuck(task.id)}
                            style={{
                              padding: '8px 14px', background: '#10b98122', border: '1px solid #10b98144',
                              borderRadius: 8, color: '#10b981', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                            }}
                          >✓ I'm no longer stuck</button>
                        </div>
                      )}
                      {isCompleted && <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600, marginTop: 4 }}>✨ Completed!</div>}
                      {task.is_locked && !isCompleted && (
                        <div style={{ color: '#4b5563', fontSize: 13, marginTop: 4 }}>🔒 Locked — wait for your instructor to unlock this step</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 24 }}>
            {/* Sidebar Tabs */}
            <div style={{ display: 'flex', background: '#1e1e35', borderRadius: 12, padding: 4, marginBottom: 12 }}>
              {(['leaderboard', 'resources'] as SidebarTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  style={{
                    flex: 1, padding: '8px', border: 'none', borderRadius: 10, cursor: 'pointer',
                    background: sidebarTab === tab ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                    color: sidebarTab === tab ? '#fff' : '#64748b',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.2s',
                  }}
                >
                  {tab === 'leaderboard' ? '🏆 Leaderboard' : '📚 Resources'}
                </button>
              ))}
            </div>

            <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16, padding: 16 }}>
              {sidebarTab === 'leaderboard' ? (
                <>
                  {displayLeaderboard.slice(0, 8).map((s, i) => {
                    const isMe = s.id === currentStudent.id
                    const lvl = getLevel(s.total_xp)
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px',
                        borderRadius: 12, marginBottom: 6, transition: 'all 0.2s',
                        background: isMe ? 'linear-gradient(135deg,#7c3aed22,#a855f722)' : 'transparent',
                        border: isMe ? '1px solid #7c3aed44' : '1px solid transparent',
                      }}>
                        <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{medals[i] || `${i + 1}`}</span>
                        <span style={{ fontSize: 20 }}>{s.avatar}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: isMe ? 800 : 600, fontSize: 14,
                            color: isMe ? '#a78bfa' : '#e2e8f0',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{s.name}{isMe ? ' (you)' : ''}</div>
                          <div style={{ fontSize: 10, color: lvl.color }}>{lvl.icon} {lvl.name}</div>
                        </div>
                        <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: 14, flexShrink: 0 }}>⚡{s.total_xp}</div>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div>
                  {taskResources.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
                        📌 FOR THIS TASK
                      </div>
                      {taskResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                  {sessionResources.length > 0 && (
                    <div>
                      <div style={{ color: '#64748b', fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
                        SESSION RESOURCES
                      </div>
                      {sessionResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                  {taskResources.length === 0 && sessionResources.length === 0 && (
                    <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 16 }}>
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
