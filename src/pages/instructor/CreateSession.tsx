import { useState } from 'react'
import { supabase } from '../../supabase'
import { genCode } from '../../lib/utils'
import type { FieldType, ModuleInput, Session, SessionFieldInput, Task, TaskInput } from '../../types'

type SessionMode = 'workshop' | 'course'

const DEFAULT_TASKS: TaskInput[] = [
  { title: 'Install Node.js & npm', description: 'Download from nodejs.org and verify by running node --version', xp: 100 },
  { title: 'Create a Git repository', description: 'Create a new folder and run git init inside it', xp: 150 },
  { title: 'Create your first branch', description: 'Run git checkout -b feature/your-name', xp: 150 },
  { title: 'Make your first commit', description: 'Create a file, then git add . then git commit -m "first commit"', xp: 200 },
  { title: 'Push code to Remote', description: 'Set remote origin and run git push -u origin main', xp: 250 },
]

const inputCls = 'w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all text-sm'

function TaskEditor({ tasks, onChange }: { tasks: TaskInput[]; onChange: (t: TaskInput[]) => void }) {
  const add = () => onChange([...tasks, { title: '', description: '', xp: 100 }])
  const remove = (i: number) => onChange(tasks.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof TaskInput, value: string | number) =>
    onChange(tasks.map((t, idx) => idx === i ? { ...t, [field]: value } : t))

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => (
        <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-md p-3">
          <div className="flex items-center gap-3 mb-2">
            {/* Number badge */}
            <div className="w-6 h-6 rounded bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-400 font-mono text-[11px] font-bold">{i + 1}</span>
            </div>
            <input
              value={task.title}
              onChange={e => update(i, 'title', e.target.value)}
              placeholder="Task title"
              className={`${inputCls} flex-1 py-2`}
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <input
                type="number"
                value={task.xp}
                onChange={e => update(i, 'xp', Number(e.target.value))}
                className="w-16 bg-neutral-900 border border-orange-500/25 rounded-md px-2 py-2 text-orange-400 font-bold font-mono text-sm outline-none focus:border-orange-500/50 text-center"
              />
              <span className="text-orange-500/70 font-mono text-[10px] font-bold uppercase">XP</span>
            </div>
            {tasks.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="w-7 h-7 flex items-center justify-center rounded text-red-500/60 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm flex-shrink-0"
              >✕</button>
            )}
          </div>
          <input
            value={task.description}
            onChange={e => update(i, 'description', e.target.value)}
              placeholder="Hint for students (optional)"
            className={`${inputCls} py-2 text-neutral-500`}
          />
        </div>
      ))}
      <button
        onClick={add}
        className="w-full py-2.5 border border-dashed border-neutral-700 hover:border-orange-500/40 hover:text-orange-400 text-neutral-600 rounded-md text-sm transition-colors"
      >
        + Add Task
      </button>
    </div>
  )
}

export function CreateSession({ onSessionReady }: { onSessionReady: (session: Session, tasks: Task[]) => void }) {
  const [mode, setMode] = useState<SessionMode>('workshop')
  const [title, setTitle] = useState('Git & GitHub Workshop')
  const [description, setDescription] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [workshopTasks, setWorkshopTasks] = useState<TaskInput[]>(DEFAULT_TASKS)
  const [modules, setModules] = useState<ModuleInput[]>([
    { title: 'Module 1', description: '', tasks: [{ title: '', description: '', xp: 100 }] },
  ])
  const [customFields, setCustomFields] = useState<SessionFieldInput[]>([])
  const [loading, setLoading] = useState(false)

  const addModule = () =>
    setModules(p => [...p, { title: `Module ${p.length + 1}`, description: '', tasks: [{ title: '', description: '', xp: 100 }] }])

  const updateModule = (i: number, field: keyof Omit<ModuleInput, 'tasks'>, value: string) =>
    setModules(p => p.map((m, idx) => idx === i ? { ...m, [field]: value } : m))

  const updateModuleTasks = (i: number, tasks: TaskInput[]) =>
    setModules(p => p.map((m, idx) => idx === i ? { ...m, tasks } : m))

  const addField = () => setCustomFields(p => [
    ...p,
    { field_key: `field_${p.length + 1}`, field_label: '', field_type: 'text' as FieldType, is_required: false, field_order: p.length, options: [] },
  ])
  const updateField = (i: number, updates: Partial<SessionFieldInput>) =>
    setCustomFields(p => p.map((f, idx) => idx === i ? { ...f, ...updates } : f))
  const removeField = (i: number) => setCustomFields(p => p.filter((_, idx) => idx !== i))

  const handleCreate = async () => {
    if (!title.trim()) return
    setLoading(true)

    const { data: authUser } = await supabase.auth.getUser()
    const code = customCode.length >= 4 ? customCode : genCode()

    const { data: sess, error: sErr } = await supabase.from('sessions').insert({
      title, description: description || null,
      join_code: code, session_type: mode,
      instructor_id: authUser.user?.id ?? null,
      is_active: false,
    }).select().single()

    if (sErr || !sess) { setLoading(false); alert('Error: ' + sErr?.message); return }

    let allTasks: Task[] = []

    if (mode === 'workshop') {
      const { data: tasks, error: tErr } = await supabase.from('tasks').insert(
        workshopTasks.map((t, i) => ({
          session_id: sess.id, title: t.title, description: t.description || null,
          task_order: i + 1, xp_reward: t.xp, is_locked: i !== 0,
        }))
      ).select()
      if (tErr || !tasks) { setLoading(false); alert('Error: ' + tErr?.message); return }
      allTasks = tasks
    } else {
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi]
        const { data: moduleRow, error: mErr } = await supabase.from('modules').insert({
          session_id: sess.id, title: mod.title, description: mod.description || null,
          module_order: mi + 1, is_locked: mi !== 0,
        }).select().single()
        if (mErr || !moduleRow) continue
        const { data: tasks } = await supabase.from('tasks').insert(
          mod.tasks.map((t, i) => ({
            session_id: sess.id, module_id: moduleRow.id, title: t.title,
            description: t.description || null, task_order: i + 1, xp_reward: t.xp, is_locked: mi !== 0,
          }))
        ).select()
        if (tasks) allTasks = [...allTasks, ...tasks]
      }
    }

    if (customFields.length > 0) {
      await supabase.from('session_fields').insert(
        customFields.map((f, i) => ({
          session_id: sess.id, field_key: f.field_key || `field_${i + 1}`,
          field_label: f.field_label, field_type: f.field_type,
          is_required: f.is_required, field_order: i, options: f.options,
        }))
      )
    }

    setLoading(false)
    onSessionReady(sess, allTasks)
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      {/* Subtle bg */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-orange-600/4 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-12 pb-20">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 rounded text-[10px] tracking-wider font-mono font-bold bg-neutral-900 text-orange-500 border border-orange-900/30 uppercase">
              New Session
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Create New Session</h1>
          <p className="text-neutral-500 text-sm">Define tasks and registration fields, then launch the session</p>
        </div>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {(['workshop', 'course'] as SessionMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`bg-[#0a0a0a] border rounded-xl p-5 text-right transition-all relative overflow-hidden ${
                mode === m
                  ? 'border-orange-500/40 shadow-[0_0_24px_rgba(249,115,22,0.1)]'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {mode === m && (
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
              )}
              <div className="text-2xl mb-2">{m === 'workshop' ? '🔧' : '📚'}</div>
              <div className={`font-bold text-sm mb-0.5 ${mode === m ? 'text-white' : 'text-neutral-400'}`}>
                {m === 'workshop' ? 'Workshop' : 'Course'}
              </div>
              <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider">
                {m === 'workshop' ? 'Sequential Tasks' : 'Modules + Tasks'}
              </div>
            </button>
          ))}
        </div>

        {/* Session Info */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-6 bg-orange-500 rounded-full flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-white">Session Info</div>
              <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Session Info</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                Session Title <span className="text-orange-500">*</span>
              </label>
              <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Git & GitHub Workshop" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                Description (optional)
              </label>
              <input className={inputCls} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description shown to students" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                Custom Join Code <span className="text-neutral-600 font-normal normal-case">(optional)</span>
              </label>
              <input
                className={inputCls}
                value={customCode}
                onChange={e => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                placeholder="e.g. GIT101  —  leave blank for auto-generated code"
                maxLength={10}
              />
              {customCode.length > 0 && customCode.length < 4 && (
                <p className="text-amber-500 text-xs mt-1.5 font-mono">Minimum 4 characters</p>
              )}
            </div>
          </div>
        </div>

        {/* Tasks - Workshop */}
        {mode === 'workshop' && (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 mb-4">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-6 bg-orange-500 rounded-full flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Tasks</div>
                <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Tasks</div>
              </div>
            </div>
            <TaskEditor tasks={workshopTasks} onChange={setWorkshopTasks} />
          </div>
        )}

        {/* Modules - Course */}
        {mode === 'course' && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-6 bg-orange-500 rounded-full flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Modules</div>
                <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Modules</div>
              </div>
            </div>
            {modules.map((mod, mi) => (
              <div key={mi} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 mb-3">
                <div className="flex gap-3 mb-4">
                  <input
                    value={mod.title}
                    onChange={e => updateModule(mi, 'title', e.target.value)}
                    placeholder={`Module ${mi + 1}`}
                    className={`${inputCls} flex-1`}
                  />
                  <input
                    value={mod.description}
                    onChange={e => updateModule(mi, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className={`${inputCls} flex-2 text-neutral-500`}
                  />
                </div>
                <TaskEditor tasks={mod.tasks} onChange={tasks => updateModuleTasks(mi, tasks)} />
              </div>
            ))}
            <button
              onClick={addModule}
              className="w-full py-2.5 border border-dashed border-orange-500/20 hover:border-orange-500/40 text-neutral-600 hover:text-orange-400 rounded-xl text-sm transition-colors"
            >
              + Add Module
            </button>
          </div>
        )}

        {/* Custom Fields */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-orange-500 rounded-full flex-shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Custom Fields</div>
                <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Custom Fields</div>
              </div>
            </div>
            <button
              onClick={addField}
              className="text-xs font-mono text-orange-500/70 hover:text-orange-400 transition-colors uppercase tracking-wider"
            >
              + Add Field
            </button>
          </div>

          {customFields.length === 0 ? (
            <p className="text-neutral-700 text-sm text-center py-2 font-mono">No custom fields</p>
          ) : (
            <div className="space-y-2">
              {customFields.map((field, i) => (
                <div key={i} className="flex gap-2 items-center bg-neutral-900/50 border border-neutral-800 rounded-md p-2.5">
                  <input
                    value={field.field_label}
                    onChange={e => updateField(i, { field_label: e.target.value, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    placeholder="Field name"
                    className="flex-1 bg-transparent text-sm text-neutral-200 placeholder-neutral-600 outline-none"
                  />
                  <select
                    value={field.field_type}
                    onChange={e => updateField(i, { field_type: e.target.value as FieldType })}
                    className="bg-neutral-900 border border-neutral-700 rounded text-neutral-400 text-xs px-2 py-1.5 outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="url">URL</option>
                    <option value="select">Select</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-neutral-600 text-xs cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={field.is_required} onChange={e => updateField(i, { is_required: e.target.checked })} />
                    Required
                  </label>
                  <button onClick={() => removeField(i)} className="text-red-500/50 hover:text-red-400 transition-colors text-sm">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Launch Button */}
        <button
          onClick={handleCreate}
          disabled={loading || !title.trim()}
          className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-5 rounded-sm transition-all hover:-translate-y-0.5 active:translate-y-0 text-base shadow-[0_0_24px_rgba(234,88,12,0.3)] hover:shadow-[0_0_32px_rgba(234,88,12,0.4)] flex items-center justify-center gap-2"
        >
          {loading ? 'Creating...' : '🚀 Launch Session'}
        </button>
      </div>
    </div>
  )
}
