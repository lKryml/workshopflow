import { useCallback, useState } from 'react'
import { ConnectionStatus } from '../../components/ConnectionStatus'
import { getStudentTaskStatus, useInstructorSession } from '../../hooks/useInstructorSession'
import { copyToClipboard } from '../../lib/utils'
import { getLevel } from '../../lib/xp'
import { ResourceModal } from './ResourceModal'
import type { Resource, Session, SessionField, Task } from '../../types'

function resolveFieldLink(field: SessionField, value: string): { href: string; display: string } | null {
  const v = value.trim()
  if (!v) return null
  if (field.field_type === 'url') {
    const href = /^https?:\/\//.test(v) ? v : `https://${v}`
    return { href, display: v.replace(/^https?:\/\//, '').replace(/\/$/, '') }
  }
  const isGitHub = /github/i.test(field.field_key) || /github/i.test(field.field_label)
  if (isGitHub) {
    const username = v
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/^@/, '')
      .replace(/[/?#].*$/, '')
      .trim()
    if (!username) return null
    return { href: `https://github.com/${username}`, display: `@${username}` }
  }
  return null
}

export function InstructorDashboard({
  session,
  initialTasks,
}: {
  session: Session
  initialTasks: Task[]
}) {
  const {
    session: liveSession,
    tasks, students, completions, helpQueue, resources, sessionFields, isConnected,
    toggleLock, sendBroadcast, pingStudent, resolveHelp, addResource, removeResource, exportCSV, startSession, kickStudent,
  } = useInstructorSession(session.id, initialTasks)

  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastError, setBroadcastError] = useState('')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)

  const handleSendBroadcast = useCallback(async () => {
    if (!broadcastMsg.trim()) return
    setBroadcastLoading(true); setBroadcastError('')
    const ok = await sendBroadcast(broadcastMsg)
    setBroadcastLoading(false)
    if (ok) { setBroadcastMsg(''); setShowBroadcast(false) }
    else setBroadcastError('Failed to send. Check connection and retry.')
  }, [broadcastMsg, sendBroadcast])

  const handleCopyCode = () => {
    copyToClipboard(session.join_code)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const sortedTasks = [...tasks].sort((a, b) => a.task_order - b.task_order)
  const sortedStudents = [...students].sort((a, b) => b.total_xp - a.total_xp)
  const currentTaskIdx = tasks.filter(t => !t.is_locked).length - 1
  const currentTask = sortedTasks[Math.max(currentTaskIdx, 0)]
  const currentDone = currentTask
    ? completions.filter(c => c.task_id === currentTask.id && !c.is_stuck).length
    : 0
  const completionPct = students.length > 0 ? Math.round((currentDone / students.length) * 100) : 0
  const avgDone = students.length > 0
    ? Math.round(students.reduce((a, s) =>
        a + completions.filter(c => c.student_id === s.id && !c.is_stuck).length, 0
      ) / students.length * 10) / 10
    : 0

  const isWaiting = liveSession ? !liveSession.is_active : !session.is_active

  return (
    <div className="min-h-screen bg-[#050505]">
      <ConnectionStatus state={isConnected ? 'connected' : 'reconnecting'} />

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-sm border-b border-neutral-900 px-5 py-3 flex flex-wrap items-center gap-3">
        <span className="text-base">⚡</span>
        <span className="font-bold text-white text-base">{session.title}</span>

        {/* Join code */}
        <span
          className="font-mono text-[12px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded tracking-widest cursor-pointer hover:bg-orange-500/15 transition-colors"
          onClick={handleCopyCode}
          title="Click to copy"
        >
          {session.join_code}
        </span>

        <button
          onClick={handleCopyCode}
          className={`text-[11px] font-mono uppercase tracking-wider transition-colors ${
            copyFeedback ? 'text-green-400' : 'text-neutral-600 hover:text-neutral-400'
          }`}
        >
          {copyFeedback ? '✓ Copied' : 'Copy'}
        </button>

        <button
          onClick={exportCSV}
          className="text-[11px] font-mono text-neutral-600 hover:text-neutral-400 uppercase tracking-wider transition-colors"
        >
          Export
        </button>

        {/* Student count */}
        <span className="font-mono text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-1 rounded uppercase tracking-wider">
          {students.length} students
        </span>

        <div className="flex-1" />

        {/* Help alert pill */}
        {helpQueue.length > 0 && (
          <span className="font-mono text-[11px] bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-1 rounded-full animate-pulse">
            {helpQueue.length} need help
          </span>
        )}

        <button
          onClick={() => { setShowBroadcast(true); setBroadcastError('') }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-sm transition-all hover:-translate-y-0.5 shadow-[0_0_12px_rgba(234,88,12,0.3)]"
        >
          📢 Broadcast
        </button>
      </div>

      {/* ── Stats Row ── */}
      {!isWaiting && (
        <div className="px-5 pt-5 pb-0 max-w-[1400px] mx-auto">
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Step Done', value: `${currentDone}/${students.length}`, color: '#22c55e', sub: 'Step Done' },
              { label: 'Need Help', value: helpQueue.length, color: '#ef4444', sub: 'Need Help', urgent: helpQueue.length > 0 },
              { label: 'Progress', value: `${completionPct}%`, color: '#f97316', sub: 'Progress' },
              { label: 'Avg Steps', value: `${avgDone}`, color: '#f59e0b', sub: 'Avg Steps' },
            ].map((s, i) => (
              <div
                key={i}
                className={`bg-[#0a0a0a] border rounded-xl p-4 border-r-0 relative ${
                  s.urgent ? 'border-red-500/30 glow-pulse' : 'border-neutral-800'
                }`}
                style={{ borderRightWidth: 3, borderRightColor: s.color }}
              >
                <div className="text-2xl font-bold font-mono tabular-nums" style={{ color: s.color }}>{s.value}</div>
                <div className="text-neutral-500 text-xs mt-1">{s.label}</div>
                <div className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="px-5 pb-12 max-w-[1400px] mx-auto grid gap-5"
           style={{ gridTemplateColumns: isWaiting ? '1fr' : '260px 1fr', alignItems: 'start' }}>

        {isWaiting ? (
          /* ── Waiting Room ── */
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden mt-5">
            <div className="px-5 py-4 border-b border-neutral-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-orange-500 rounded-full" />
                <div>
                  <div className="text-sm font-bold text-white">Waiting Room</div>
                  <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{students.length} students registered</div>
                </div>
              </div>
              <button
                onClick={startSession}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm px-6 py-2.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-[0_0_20px_rgba(234,88,12,0.3)] flex items-center gap-2"
              >
                🚀 Start Session
              </button>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">⏳</div>
                <p className="text-neutral-600 text-sm">Waiting for students to join...</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {sortedStudents.map(s => (
                  <div key={s.id} className="relative flex flex-col items-center gap-1.5 p-3 bg-neutral-900/50 border border-neutral-800 rounded-xl">
                    <button
                      onClick={() => kickStudent(s.id)}
                      className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded text-neutral-700 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
                      title="Remove student"
                    >✕</button>
                    <div className="text-3xl">{s.avatar}</div>
                    <div className="text-xs font-semibold text-neutral-300 truncate w-full text-center">{s.name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ── Left Sidebar ── */}
            <div className="flex flex-col gap-4">

              {/* Task Controls */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-900 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  <span className="text-xs font-bold text-white">Task Control</span>
                </div>
                {sortedTasks.map(task => {
                  const doneCount = completions.filter(c => c.task_id === task.id && !c.is_stuck).length
                  const isOn = !task.is_locked
                  const stuckCount = completions.filter(c => c.task_id === task.id && c.is_stuck).length
                  return (
                    <div key={task.id} className="flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-900 last:border-0">
                      <span className="font-mono text-[10px] text-neutral-700 w-4 text-center flex-shrink-0">{task.task_order}</span>
                      <span className={`flex-1 text-xs truncate ${isOn ? 'text-neutral-300' : 'text-neutral-600'}`}>
                        {task.title}
                      </span>
                      <span className="font-mono text-[10px] text-neutral-600 flex-shrink-0">{doneCount}/{students.length}</span>
                      {stuckCount > 0 && (
                        <span className="font-mono text-[10px] text-red-500 flex-shrink-0">{stuckCount}!</span>
                      )}
                      {/* Toggle */}
                      <button
                        onClick={() => toggleLock(task)}
                        className={`w-8 h-4.5 rounded-full transition-colors flex-shrink-0 relative ${
                          isOn ? 'bg-green-500/80' : 'bg-neutral-700'
                        }`}
                        style={{ height: 18, minWidth: 32 }}
                      >
                        <span
                          className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all ${
                            isOn ? 'right-0.5' : 'left-0.5'
                          }`}
                          style={{ width: 14, height: 14 }}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* Leaderboard */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-900 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  <span className="text-xs font-bold text-white">Leaderboard</span>
                </div>
                {sortedStudents.length === 0 ? (
                  <p className="text-neutral-700 text-xs text-center py-4 font-mono">No students yet</p>
                ) : sortedStudents.slice(0, 8).map((s, i) => {
                  const level = getLevel(s.total_xp)
                  const medals = ['🥇', '🥈', '🥉']
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-neutral-900 last:border-0 ${
                        i === 0 ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <span className="text-xs w-4 text-center flex-shrink-0">{medals[i] ?? `${i + 1}`}</span>
                      <span className="text-base flex-shrink-0">{s.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-neutral-200 truncate">{s.name}</div>
                        <div className="text-[10px] flex items-center gap-1" style={{ color: level.color }}>
                          {level.icon} {level.name}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Resources */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-900 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  <span className="text-xs font-bold text-white">Resources</span>
                  <button
                    onClick={() => setShowResourceModal(true)}
                    className="text-[10px] font-mono text-orange-500/70 hover:text-orange-400 transition-colors uppercase tracking-wider ml-auto"
                  >
                    + Add
                  </button>
                </div>
                {resources.length === 0 ? (
                  <p className="text-neutral-700 text-xs text-center py-4 font-mono">No resources</p>
                ) : resources.map(r => (
                  <div key={r.id} className="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-900 last:border-0">
                    <span className="flex-1 text-xs text-neutral-400 truncate">{r.title}</span>
                    <span className="text-[9px] font-mono text-neutral-700 uppercase bg-neutral-900 px-1.5 py-0.5 rounded flex-shrink-0">
                      {r.resource_type}
                    </span>
                    <button
                      onClick={() => removeResource(r.id)}
                      className="text-neutral-700 hover:text-red-500 transition-colors text-sm flex-shrink-0"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Main Content ── */}
            <div className="flex flex-col gap-4">

              {/* Help Queue */}
              {helpQueue.length > 0 && (
                <div className="bg-[#0a0a0a] border border-red-500/25 rounded-xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-red-500/15 bg-red-500/5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 dot-stuck" />
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                      Help Queue — {helpQueue.length}
                    </span>
                    <span className="text-[10px] font-mono text-red-500/50 uppercase tracking-widest ml-auto">Help Queue</span>
                  </div>
                  {helpQueue.map((req, i) => (
                    <div
                      key={req.student.id}
                      className="flex items-center gap-3 px-5 py-3.5 border-b border-neutral-900 last:border-0 hover:bg-red-500/3 transition-colors"
                    >
                      <span className="font-mono text-[10px] bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-0.5 rounded flex-shrink-0">
                        #{i + 1}
                      </span>
                      <span className="text-xl flex-shrink-0">{req.student.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-neutral-200">{req.student.name}</div>
                        {req.completion.stuck_note && (
                          <div className="text-neutral-500 text-xs italic mt-0.5">"{req.completion.stuck_note}"</div>
                        )}
                        <div className="text-[10px] font-mono text-neutral-700 mt-0.5 uppercase tracking-wider">
                          {req.taskTitle}
                        </div>
                      </div>
                      <button
                        onClick={() => pingStudent(req.student.id)}
                        className="flex-shrink-0 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-sm transition-colors"
                        title="Notify student you're on your way"
                      >
                        📍 On my way
                      </button>
                      <button
                        onClick={() => resolveHelp(req.student.id, req.completion.task_id)}
                        className="flex-shrink-0 bg-green-500/15 hover:bg-green-500/25 border border-green-500/25 text-green-400 text-xs font-bold px-3 py-1.5 rounded-sm transition-colors"
                      >
                        Resolved ✓
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Class Progress Table */}
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-900 flex items-center gap-2">
                  <div className="w-1 h-4 bg-orange-500 rounded-full" />
                  <span className="text-xs font-bold text-white">Class Progress</span>
                  {students.length > 0 && (
                    <span className="text-[10px] font-mono text-neutral-600 ml-auto">{students.length} students</span>
                  )}
                </div>

                {students.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-neutral-600 text-sm">Session is live — waiting for students</p>
                    <span className="font-mono text-sm font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded tracking-widest mt-3 inline-block">
                      {session.join_code}
                    </span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-900">
                          <th className="text-left py-3 px-5 text-neutral-600 font-mono text-[10px] uppercase tracking-wider min-w-[180px]">
                            Student
                          </th>
                          {sortedTasks.map(task => (
                            <th key={task.id} className="py-3 px-2 text-center min-w-[72px]">
                              <div
                                className="text-[10px] font-semibold truncate max-w-[70px] mx-auto"
                                style={{ color: !task.is_locked ? '#d4d4d4' : '#404040' }}
                                title={task.title}
                              >
                                {task.title}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map(student => {
                          const level = getLevel(student.total_xp)
                          const anyStuck = completions.some(c => c.student_id === student.id && c.is_stuck)
                          return (
                            <tr
                              key={student.id}
                              className={`border-b border-neutral-900 last:border-0 transition-colors ${
                                anyStuck ? 'bg-red-500/3' : 'hover:bg-neutral-900/20'
                              }`}
                            >
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-lg flex-shrink-0">{student.avatar}</span>
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-neutral-200 truncate">{student.name}</div>
                                    <div className="text-[10px] flex items-center gap-1" style={{ color: level.color }}>
                                      {level.icon} {level.name}
                                    </div>
                                    {sessionFields.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {sessionFields.map(field => {
                                          const value = student.custom_fields?.[field.field_key]
                                          if (!value?.trim()) return null
                                          const link = resolveFieldLink(field, value)
                                          return link ? (
                                            <a
                                              key={field.field_key}
                                              href={link.href}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[9px] font-mono text-orange-400/80 hover:text-orange-400 bg-orange-500/10 hover:bg-orange-500/15 px-1.5 py-0.5 rounded transition-colors truncate max-w-[120px]"
                                              title={`${field.field_label}: ${value}`}
                                            >
                                              {link.display}
                                            </a>
                                          ) : (
                                            <span
                                              key={field.field_key}
                                              className="text-[9px] font-mono text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                                              title={`${field.field_label}: ${value}`}
                                            >
                                              {value}
                                            </span>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {sortedTasks.map(task => {
                                const status = task.is_locked
                                  ? 'locked'
                                  : getStudentTaskStatus(student.id, task.id, completions)

                                if (status === 'done') return (
                                  <td key={task.id} className="py-3 px-2 text-center">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-green-500/15 text-green-400 font-bold text-sm">✓</span>
                                  </td>
                                )
                                if (status === 'stuck') return (
                                  <td key={task.id} className="py-3 px-2 text-center">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs animate-pulse">!</span>
                                  </td>
                                )
                                if (status === 'available') return (
                                  <td key={task.id} className="py-3 px-2 text-center">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded text-neutral-600 text-sm">→</span>
                                  </td>
                                )
                                return (
                                  <td key={task.id} className="py-3 px-2 text-center">
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded text-neutral-800 text-sm">—</span>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Legend */}
                    <div className="px-5 py-3 border-t border-neutral-900 flex items-center gap-5">
                      <span className="text-[10px] font-mono text-neutral-700 uppercase tracking-widest">Legend:</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-green-400/70 font-mono"><span className="w-4 h-4 rounded bg-green-500/15 flex items-center justify-center text-green-400 text-xs">✓</span> Done</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-red-400/70 font-mono"><span className="w-4 h-4 rounded bg-red-500/15 border border-red-500/25 flex items-center justify-center text-red-400 text-xs">!</span> Stuck</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-mono"><span className="text-neutral-600 text-xs">→</span> Working</span>
                      <span className="flex items-center gap-1.5 text-[10px] text-neutral-800 font-mono"><span className="text-neutral-800 text-xs">—</span> Locked</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Broadcast Modal ── */}
      {showBroadcast && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setShowBroadcast(false)}
        >
          <div
            className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 relative overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
            <h3 className="text-base font-bold text-white mb-1">📢 Broadcast to All Students</h3>
            <p className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-5">Broadcast to All</p>
            <textarea
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
              placeholder="e.g. ⚠️ Stop here — wait for me before moving to step 4"
              className="w-full h-24 bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none text-sm resize-none mb-3"
            />
            {broadcastError && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2 text-red-400 text-xs mb-3">
                {broadcastError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSendBroadcast}
                disabled={broadcastLoading || !broadcastMsg.trim()}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-sm text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {broadcastLoading ? 'Sending...' : 'Send 🚀'}
              </button>
              <button
                onClick={() => { setShowBroadcast(false); setBroadcastError('') }}
                className="px-5 py-3 border border-neutral-800 hover:border-neutral-700 text-neutral-400 rounded-sm text-sm transition-colors"
              >
                Cancel
              </button>
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
