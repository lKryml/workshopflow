import { useCallback, useState } from 'react'
import { BroadcastBanner } from '../../components/BroadcastBanner'
import { Confetti } from '../../components/Confetti'
import { ConnectionStatus } from '../../components/ConnectionStatus'
import { XPFloat } from '../../components/XPFloat'
import { useStudentSession } from '../../hooks/useStudentSession'
import { getTaskBadge, getAllTasksBadge } from '../../lib/badges'
import { toYouTubeEmbed } from '../../lib/utils'
import type { Resource, Session, Student, Task } from '../../types'

function ResourceItem({ resource }: { resource: Resource }) {
  const embedUrl = resource.resource_type === 'embed' && resource.url
    ? toYouTubeEmbed(resource.url) ?? resource.url
    : null

  return (
    <div className="mb-4">
      <div className="font-semibold text-sm text-neutral-100 mb-1">{resource.title}</div>
      {resource.description && (
        <div className="text-neutral-400 text-xs mb-2">{resource.description}</div>
      )}
      {resource.resource_type === 'link' && resource.url && (
        <a href={resource.url} target="_blank" rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
          🔗 فتح الرابط
        </a>
      )}
      {resource.resource_type === 'file' && resource.file_path && (
        <a href={resource.file_path} target="_blank" rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 text-sm transition-colors">
          📄 تحميل الملف
        </a>
      )}
      {embedUrl && (
        <div className="relative mt-2 rounded-lg overflow-hidden" style={{ paddingTop: '56.25%' }}>
          <iframe
            src={embedUrl}
            title={resource.title}
            className="absolute top-0 left-0 w-full h-full border-0"
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
    student, tasks, completions, leaderboard, resources, isConnected, broadcastMessage, pingMessage,
    completeTask, markStuck, unmarkStuck, dismissBroadcast, dismissPing,
  } = useStudentSession(initialStudent.id, session.id)

  const currentStudent = student ?? initialStudent

  const [showConfetti, setShowConfetti] = useState(false)
  const [showXP, setShowXP] = useState(false)
  const [lastXP, setLastXP] = useState(0)
  const [justCompleted, setJustCompleted] = useState<string | null>(null)
  const [stuckTaskId, setStuckTaskId] = useState<string | null>(null)
  const [stuckNote, setStuckNote] = useState('')

  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : [initialStudent]
  const displayTasks = tasks.length > 0 ? tasks : initialTasks

  const handleComplete = useCallback(async (task: Task) => {
    await completeTask(task)
    setLastXP(task.xp_reward)
    setShowXP(true)
    setShowConfetti(true)
    setJustCompleted(task.id)
    setTimeout(() => {
      setShowXP(false)
      setShowConfetti(false)
      setJustCompleted(null)
    }, 800)
  }, [completeTask])

  const handleStuckSubmit = useCallback(async () => {
    if (!stuckTaskId) return
    await markStuck(stuckTaskId, stuckNote)
    setStuckTaskId(null)
    setStuckNote('')
  }, [stuckTaskId, stuckNote, markStuck])

  const sortedTasks = [...displayTasks].sort((a, b) => a.task_order - b.task_order)
  const doneCount = completions.filter(c => !c.is_stuck).length
  const rank = displayLeaderboard.findIndex(s => s.id === currentStudent.id) + 1

  const currentTask = sortedTasks.find(t => !t.is_locked && !completions.find(c => c.task_id === t.id && !c.is_stuck))
  const sessionResources = resources.filter(r => r.task_id === null)
  const taskResources = currentTask ? resources.filter(r => r.task_id === currentTask.id) : []
  const allTasksBadge = getAllTasksBadge(currentStudent.id, displayTasks, completions)

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505]">
      <ConnectionStatus state={isConnected ? 'connected' : 'reconnecting'} />
      <Confetti trigger={showConfetti} />
      <XPFloat xp={lastXP} show={showXP} />
      <BroadcastBanner message={broadcastMessage} onDismiss={dismissBroadcast} />

      {/* Instructor ping notification */}
      {pingMessage && (
        <div className="fixed bottom-16 left-4 z-[9998] bg-green-600/95 backdrop-blur-sm border border-green-500/40 text-white px-4 py-3 rounded-xl shadow-[0_4px_20px_rgba(34,197,94,0.3)] flex items-center gap-3 broadcast-in">
          <span className="text-lg flex-shrink-0">🙋</span>
          <span className="text-sm font-bold">{pingMessage}</span>
          <button
            onClick={dismissPing}
            className="w-6 h-6 flex items-center justify-center rounded text-green-200 hover:text-white hover:bg-green-500/30 transition-colors text-base flex-shrink-0"
          >
            ×
          </button>
        </div>
      )}

      {/* Stuck Modal */}
      {stuckTaskId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => { setStuckTaskId(null); setStuckNote('') }}
        >
          <div
            className="w-full max-w-md bg-[#0a0a0a] border border-neutral-700 rounded-xl p-7 relative overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            <h3 className="text-base font-bold text-red-400 mb-1">🆘 طلب المساعدة</h3>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-5">Ask for Help</p>
            <p className="text-neutral-400 text-sm mb-3">أخبر مدرسك بما حدث (اختياري):</p>
            <textarea
              value={stuckNote}
              onChange={e => setStuckNote(e.target.value)}
              placeholder="مثال: خطأ في الصلاحيات..."
              className="w-full h-20 bg-neutral-900 border border-neutral-700 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none text-sm resize-none mb-3"
            />
            <div className="flex gap-3">
              <button
                onClick={handleStuckSubmit}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-sm text-sm transition-all"
              >
                إرسال طلب المساعدة 🆘
              </button>
              <button
                onClick={() => { setStuckTaskId(null); setStuckNote('') }}
                className="px-5 py-3 border border-neutral-700 hover:border-neutral-600 text-neutral-400 rounded-sm text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pb-12 pt-4 max-w-[1100px] mx-auto">

        {/* Profile Hero */}
        <div className="bg-[#0d0d0d] border border-neutral-700 rounded-xl p-6 mb-5">
          <div className="flex items-center gap-5 flex-wrap">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-18 h-18 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-5xl" style={{ width: 72, height: 72 }}>
                {currentStudent.avatar}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <h2 className="text-2xl font-bold text-white">{currentStudent.name}</h2>
                {rank > 0 && (
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    #{rank} leaderboard
                  </span>
                )}
                {allTasksBadge && (
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    {allTasksBadge} أنجزت الكل!
                  </span>
                )}
              </div>
              <div className="text-neutral-300 text-base">
                {session.title}
              </div>
            </div>

            {/* Task progress */}
            <div className="text-left flex-shrink-0">
              <div className="font-mono font-bold text-white text-3xl">{doneCount}<span className="text-neutral-500 text-lg">/{displayTasks.length}</span></div>
              <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest mt-0.5">مهام منجزة</div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 300px', alignItems: 'start' }}>

          {/* Task List — left column */}
          <div>
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest mb-3">
              {session.session_type === 'course' ? 'مهام الدورة' : 'مهام الورشة'}
            </div>

            {sortedTasks.map((task, i) => {
              const isCompleted = !!completions.find(c => c.task_id === task.id && !c.is_stuck)
              const isStuck = !!completions.find(c => c.task_id === task.id && c.is_stuck)
              // Sequential enforcement: all previous tasks must be done
              const prevDone = i === 0 || sortedTasks.slice(0, i).every(t =>
                !!completions.find(c => c.task_id === t.id && !c.is_stuck)
              )
              const isInstructorLocked = task.is_locked
              const isSequentiallyLocked = !isInstructorLocked && !prevDone
              const isAvailable = !isInstructorLocked && prevDone
              const isFlashing = justCompleted === task.id
              const badge = isCompleted ? getTaskBadge(currentStudent.id, task.id, completions) : null

              return (
                <div
                  key={task.id}
                  className={`bg-[#0d0d0d] border rounded-xl p-5 mb-3 transition-all ${
                    isCompleted
                      ? 'border-green-500/30'
                      : isStuck
                      ? 'border-red-500/40 glow-pulse'
                      : isAvailable
                      ? 'border-neutral-600'
                      : 'border-neutral-800'
                  } ${(isInstructorLocked || isSequentiallyLocked) && !isCompleted ? 'opacity-50' : ''} ${isFlashing ? 'task-flash' : ''}`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Number / Status circle */}
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-base font-bold mt-0.5"
                      style={{
                        background: isCompleted
                          ? 'rgba(34,197,94,0.15)'
                          : isInstructorLocked ? 'rgba(40,40,40,0.5)'
                          : isSequentiallyLocked ? 'rgba(40,40,40,0.5)'
                          : 'rgba(249,115,22,0.12)',
                        color: isCompleted ? '#22c55e'
                          : isInstructorLocked ? '#404040'
                          : isSequentiallyLocked ? '#555'
                          : '#f97316',
                        border: `1px solid ${
                          isCompleted ? 'rgba(34,197,94,0.3)'
                          : isInstructorLocked ? 'rgba(64,64,64,0.4)'
                          : isSequentiallyLocked ? 'rgba(80,80,80,0.4)'
                          : 'rgba(249,115,22,0.25)'
                        }`,
                      }}
                    >
                      {isCompleted ? '✓' : isInstructorLocked ? '🔒' : i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1.5">
                        <h4 className={`text-base font-bold ${
                          isCompleted ? 'text-green-400 line-through' : 'text-white'
                        }`}>
                          {task.title}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {badge && (
                            <span className="text-base">{badge}</span>
                          )}
                          <span className="font-mono text-xs font-bold text-amber-500/50">
                            ⚡{task.xp_reward}
                          </span>
                        </div>
                      </div>

                      {task.description && (
                        <p className="text-neutral-300 text-sm leading-relaxed mb-3">{task.description}</p>
                      )}

                      {!isCompleted && !isStuck && isAvailable && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleComplete(task)}
                            className="bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-sm font-bold px-4 py-2 rounded-sm transition-colors"
                          >
                            تم الإنجاز ✓
                          </button>
                          <button
                            onClick={() => setStuckTaskId(task.id)}
                            className="bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-bold px-4 py-2 rounded-sm transition-colors"
                          >
                            عالق 🆘
                          </button>
                        </div>
                      )}

                      {isStuck && (
                        <div className="mt-3">
                          <div className="bg-red-500/10 border border-red-500/25 rounded-md px-3 py-2 text-red-400/80 text-sm mb-2">
                            🆘 طلبت المساعدة — مدرسك في الطريق!
                          </div>
                          <button
                            onClick={() => unmarkStuck(task.id)}
                            className="bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-sm font-bold px-4 py-2 rounded-sm transition-colors"
                          >
                            لست عالقًا بعد الآن ✓
                          </button>
                        </div>
                      )}

                      {isCompleted && !badge && (
                        <div className="text-green-500/70 text-sm font-semibold mt-1.5">✨ تم!</div>
                      )}

                      {isCompleted && badge && (
                        <div className="text-sm font-bold mt-1.5" style={{ color: badge === '🥇' ? '#f59e0b' : badge === '🥈' ? '#9ca3af' : '#cd7c3f' }}>
                          {badge} {badge === '🥇' ? 'الأول!' : badge === '🥈' ? 'الثاني!' : 'الثالث!'} ✨
                        </div>
                      )}

                      {isInstructorLocked && !isCompleted && (
                        <div className="text-neutral-500 text-sm mt-1.5 font-mono">
                          🔒 مقفل — انتظر المدرس لفتح هذه الخطوة
                        </div>
                      )}

                      {isSequentiallyLocked && !isCompleted && (
                        <div className="text-neutral-500 text-sm mt-1.5">
                          أكمل الخطوة {i} أولاً
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Sidebar — always visible, no tabs */}
          <div className="sticky top-4 flex flex-col gap-3">

            {/* Leaderboard */}
            <div className="bg-[#0d0d0d] border border-neutral-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
                <div className="w-1 h-4 bg-orange-500 rounded-full" />
                <span className="text-sm font-bold text-white">المتصدرون</span>
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest mr-auto">Leaderboard</span>
              </div>
              {displayLeaderboard.slice(0, 8).map((s, i) => {
                const isMe = s.id === currentStudent.id
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-neutral-800 last:border-0 transition-colors ${
                      isMe ? 'bg-orange-500/5' : i === 0 ? 'bg-amber-500/4' : ''
                    }`}
                  >
                    <span className="text-sm w-5 text-center flex-shrink-0">{medals[i] ?? `${i + 1}`}</span>
                    <span className="text-xl flex-shrink-0">{s.avatar}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${isMe ? 'text-orange-400' : 'text-neutral-100'}`}>
                        {s.name}{isMe ? ' (أنت)' : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Resources */}
            {(taskResources.length > 0 || sessionResources.length > 0) && (
              <div className="bg-[#0d0d0d] border border-neutral-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  <span className="text-sm font-bold text-white">المراجع</span>
                  <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest mr-auto">Resources</span>
                </div>
                <div className="p-4">
                  {taskResources.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-mono text-orange-500/70 uppercase tracking-widest mb-3">📌 للمهمة الحالية</div>
                      {taskResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                  {sessionResources.length > 0 && (
                    <div>
                      <div className="text-xs font-mono text-neutral-400 uppercase tracking-widest mb-3">مراجع الجلسة</div>
                      {sessionResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
