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
    <div className="mb-4">
      <div className="font-semibold text-sm text-neutral-200 mb-1">{resource.title}</div>
      {resource.description && (
        <div className="text-neutral-600 text-xs mb-2">{resource.description}</div>
      )}
      {resource.resource_type === 'link' && resource.url && (
        <a href={resource.url} target="_blank" rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 text-xs transition-colors">
          🔗 فتح الرابط
        </a>
      )}
      {resource.resource_type === 'file' && resource.file_path && (
        <a href={resource.file_path} target="_blank" rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 text-xs transition-colors">
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
    <div dir="rtl" className="min-h-screen bg-[#050505]">
      <ConnectionStatus state={isConnected ? 'connected' : 'reconnecting'} />
      <Confetti trigger={showConfetti} />
      <XPFloat xp={lastXP} show={showXP} />
      <BroadcastBanner message={broadcastMessage} onDismiss={dismissBroadcast} />
      <LevelUpToast level={levelUpLevel} onDismiss={() => setLevelUpLevel(null)} />

      {/* Instructor ping notification — green, bottom-right, auto-dismisses */}
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
            className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-xl p-7 relative overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
            <h3 className="text-base font-bold text-red-400 mb-1">🆘 طلب المساعدة</h3>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-5">Ask for Help</p>
            <p className="text-neutral-500 text-sm mb-3">أخبر مدرسك بما حدث (اختياري):</p>
            <textarea
              value={stuckNote}
              onChange={e => setStuckNote(e.target.value)}
              placeholder="مثال: خطأ في الصلاحيات..."
              className="w-full h-20 bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-red-500 focus:ring-1 focus:ring-red-500/20 outline-none text-sm resize-none mb-3"
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
                className="px-5 py-3 border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-sm text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 pb-12 pt-4 max-w-[960px] mx-auto">

        {/* Profile Hero */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 mb-5">
          <div className="flex items-center gap-5 flex-wrap">

            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-4xl">
                {currentStudent.avatar}
              </div>
              <div className="absolute -bottom-1 -left-1 text-sm bg-[#050505] rounded-md px-0.5">
                {level.icon}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-lg font-bold text-neutral-100">{currentStudent.name}</h2>
                {rank > 0 && (
                  <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                    #{rank} في المتصدرين
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <div className="text-sm font-semibold" style={{ color: level.color }}>
                  {level.icon} {level.name}
                </div>
                {currentStudent.streak >= 2 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 font-mono text-[11px] font-bold">
                    🔥 ×{currentStudent.streak}
                  </span>
                )}
              </div>
              {/* XP Bar */}
              <div className="flex items-center gap-3 max-w-[280px]">
                <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%`, backgroundColor: level.color }}
                  />
                </div>
                <span className="text-[11px] font-mono text-neutral-600 flex-shrink-0">
                  {needed > 0 ? `${needed} XP` : 'MAX 🔥'}
                </span>
              </div>
            </div>

            {/* XP + Progress */}
            <div className="text-left flex-shrink-0">
              <div className="font-mono font-bold text-amber-400 tabular-nums text-2xl">⚡{currentStudent.total_xp.toLocaleString('ar')}</div>
              <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mt-0.5">إجمالي النقاط</div>
              <div className="text-neutral-500 text-xs mt-1">
                {doneCount}/{displayTasks.length} مهام
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 260px', alignItems: 'start' }}>

          {/* Task Checklist */}
          <div>
            <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-3">
              {session.session_type === 'course' ? 'مهام الدورة' : 'مهام الورشة'}
            </div>

            {sortedTasks.map((task, i) => {
              const isCompleted = !!completions.find(c => c.task_id === task.id && !c.is_stuck)
              const isStuck = !!completions.find(c => c.task_id === task.id && c.is_stuck)
              const isAvailable = !task.is_locked
              const isFlashing = justCompleted === task.id

              return (
                <div
                  key={task.id}
                  className={`bg-[#0a0a0a] border rounded-xl p-5 mb-3 transition-all ${
                    isCompleted
                      ? 'border-green-500/20'
                      : isStuck
                      ? 'border-red-500/30 glow-pulse'
                      : 'border-neutral-800'
                  } ${task.is_locked && !isCompleted ? 'opacity-40' : ''} ${isFlashing ? 'task-flash' : ''}`}
                >
                  <div className="flex gap-4 items-start">
                    {/* Number / Status circle */}
                    <div
                      className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-sm font-bold mt-0.5"
                      style={{
                        background: isCompleted
                          ? 'rgba(34,197,94,0.15)'
                          : task.is_locked ? 'rgba(40,40,40,0.5)' : 'rgba(249,115,22,0.12)',
                        color: isCompleted ? '#22c55e' : task.is_locked ? '#404040' : '#f97316',
                        border: `1px solid ${isCompleted ? 'rgba(34,197,94,0.25)' : task.is_locked ? 'rgba(64,64,64,0.3)' : 'rgba(249,115,22,0.2)'}`,
                      }}
                    >
                      {isCompleted ? '✓' : task.is_locked ? '🔒' : i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className={`text-sm font-semibold ${
                          isCompleted ? 'text-green-400 line-through' : 'text-neutral-200'
                        }`}>
                          {task.title}
                        </h4>
                        <span className="font-mono text-[10px] font-bold text-amber-500/70 flex-shrink-0">
                          ⚡{task.xp_reward}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-neutral-600 text-xs leading-relaxed mb-3">{task.description}</p>
                      )}

                      {!isCompleted && !isStuck && isAvailable && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleComplete(task)}
                            className="bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-400 text-xs font-bold px-3 py-1.5 rounded-sm transition-colors"
                          >
                            تم الإنجاز ✓
                          </button>
                          <button
                            onClick={() => setStuckTaskId(task.id)}
                            className="bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 text-xs font-bold px-3 py-1.5 rounded-sm transition-colors"
                          >
                            عالق 🆘
                          </button>
                        </div>
                      )}

                      {isStuck && (
                        <div className="mt-2">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 text-red-400/80 text-xs mb-2">
                            🆘 طلبت المساعدة — مدرسك في الطريق!
                          </div>
                          <button
                            onClick={() => unmarkStuck(task.id)}
                            className="bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-400 text-xs font-bold px-3 py-1.5 rounded-sm transition-colors"
                          >
                            لست عالقًا بعد الآن ✓
                          </button>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="text-green-500/70 text-xs font-semibold mt-1">✨ تم!</div>
                      )}

                      {task.is_locked && !isCompleted && (
                        <div className="text-neutral-700 text-xs mt-1 font-mono">
                          🔒 مقفل — انتظر المدرس لفتح هذه الخطوة
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Sidebar */}
          <div className="sticky top-4">

            {/* Tab switcher */}
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-1 flex gap-1 mb-3">
              {([
                { key: 'leaderboard', label: '🏆 المتصدرون' },
                { key: 'resources', label: '📚 المراجع' },
              ] as { key: SidebarTab; label: string }[]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSidebarTab(tab.key)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                    sidebarTab === tab.key
                      ? 'bg-orange-600 text-white'
                      : 'text-neutral-600 hover:text-neutral-400'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
              {sidebarTab === 'leaderboard' ? (
                <>
                  {displayLeaderboard.slice(0, 8).map((s, i) => {
                    const isMe = s.id === currentStudent.id
                    const lvl = getLevel(s.total_xp)
                    const medals = ['🥇', '🥈', '🥉']
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-900 last:border-0 transition-colors ${
                          isMe ? 'bg-orange-500/5' : i === 0 ? 'bg-amber-500/4' : ''
                        }`}
                      >
                        <span className="text-xs w-4 text-center flex-shrink-0">{medals[i] ?? `${i + 1}`}</span>
                        <span className="text-base flex-shrink-0">{s.avatar}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold truncate ${isMe ? 'text-orange-400' : 'text-neutral-200'}`}>
                            {s.name}{isMe ? ' (أنت)' : ''}
                          </div>
                          <div className="text-[10px]" style={{ color: lvl.color }}>{lvl.icon} {lvl.name}</div>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-amber-400 flex-shrink-0">⚡{s.total_xp}</span>
                      </div>
                    )
                  })}
                </>
              ) : (
                <div className="p-4">
                  {taskResources.length > 0 && (
                    <div className="mb-5">
                      <div className="text-[10px] font-mono text-orange-500/70 uppercase tracking-widest mb-3">📌 للمهمة الحالية</div>
                      {taskResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                  {sessionResources.length > 0 && (
                    <div>
                      <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-3">مراجع الجلسة</div>
                      {sessionResources.map(r => <ResourceItem key={r.id} resource={r} />)}
                    </div>
                  )}
                  {taskResources.length === 0 && sessionResources.length === 0 && (
                    <p className="text-neutral-700 text-xs text-center py-4 font-mono">لا توجد مراجع بعد</p>
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
