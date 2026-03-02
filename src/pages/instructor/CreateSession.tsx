import { useState } from 'react'
import { supabase } from '../../supabase'
import { genCode } from '../../lib/utils'
import type { FieldType, ModuleInput, Session, SessionFieldInput, Task, TaskInput } from '../../types'

type SessionMode = 'workshop' | 'course'

const DEFAULT_TASKS: TaskInput[] = [
  { title: 'Install Node.js & npm', description: 'Download from nodejs.org and verify with node --version', xp: 100 },
  { title: 'git init the project', description: 'Create a new directory and run git init inside it', xp: 150 },
  { title: 'Create your first branch', description: 'Run git checkout -b feature/your-name', xp: 150 },
  { title: 'Make a commit', description: 'Create a file, git add ., git commit -m "first commit"', xp: 200 },
  { title: 'Push to remote', description: 'Set up remote origin and git push -u origin main', xp: 250 },
]

function TaskEditor({
  tasks,
  onChange,
}: {
  tasks: TaskInput[]
  onChange: (tasks: TaskInput[]) => void
}) {
  const add = () => onChange([...tasks, { title: '', description: '', xp: 100 }])
  const remove = (i: number) => onChange(tasks.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof TaskInput, value: string | number) =>
    onChange(tasks.map((t, idx) => idx === i ? { ...t, [field]: value } : t))

  return (
    <div>
      {tasks.map((task, i) => (
        <div key={i} className="glass-sm" style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 800,
            }}>{i + 1}</div>
            <input
              value={task.title}
              onChange={e => update(i, 'title', e.target.value)}
              placeholder="Task title"
              className="field-input"
              style={{ flex: 1 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <input
                value={task.xp}
                type="number"
                onChange={e => update(i, 'xp', Number(e.target.value))}
                className="field-input"
                style={{
                  width: 70,
                  color: 'var(--amber)',
                  fontWeight: 700,
                  padding: '8px 10px',
                  borderColor: 'rgba(245,158,11,0.3)',
                }}
              />
              <span style={{ color: 'var(--amber)', fontSize: 11, fontWeight: 700 }}>XP</span>
            </div>
            {tasks.length > 1 && (
              <button
                onClick={() => remove(i)}
                className="btn btn-sm"
                style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', padding: '6px 10px' }}
              >✕</button>
            )}
          </div>
          <input
            value={task.description}
            onChange={e => update(i, 'description', e.target.value)}
            placeholder="Short hint for students (optional)"
            className="field-input"
            style={{ color: 'var(--text-muted)' }}
          />
        </div>
      ))}
      <button
        onClick={add}
        className="btn btn-ghost btn-full"
        style={{ borderStyle: 'dashed', marginTop: 4 }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = 'var(--brand)'
          e.currentTarget.style.color = 'var(--brand-light)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = 'var(--border-1)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >+ Add Task</button>
    </div>
  )
}

export function CreateSession({
  onSessionReady,
}: {
  onSessionReady: (session: Session, tasks: Task[]) => void
}) {
  const [mode, setMode] = useState<SessionMode>('workshop')
  const [title, setTitle] = useState('Git Workshop 101')
  const [description, setDescription] = useState('')
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
    const code = genCode()

    const { data: sess, error: sErr } = await supabase.from('sessions').insert({
      title,
      description: description || null,
      join_code: code,
      session_type: mode,
      instructor_id: authUser.user?.id ?? null,
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
    <div className="bg-base bg-space" style={{ minHeight: '100vh', padding: '40px 24px 60px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720 }}>
        <h2 className="gradient-text" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800 }}>
          Create New Session
        </h2>
        <p style={{ color: 'var(--text-muted)', margin: '0 0 32px', fontSize: 14 }}>
          Set up your tasks, register fields, and launch.
        </p>

        {/* Mode Toggle — side-by-side cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {(['workshop', 'course'] as SessionMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="glass glass-hover"
              style={{
                padding: 20,
                border: mode === m
                  ? `1px solid ${m === 'workshop' ? 'rgba(124,58,237,0.5)' : 'rgba(6,182,212,0.5)'}`
                  : '1px solid var(--border-1)',
                borderRadius: 16,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'var(--transition-base)',
                boxShadow: mode === m
                  ? (m === 'workshop' ? '0 0 24px rgba(124,58,237,0.2)' : '0 0 24px rgba(6,182,212,0.2)')
                  : undefined,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{m === 'workshop' ? '🔧' : '📚'}</div>
              <div style={{
                fontWeight: 700,
                fontSize: 15,
                color: mode === m
                  ? (m === 'workshop' ? 'var(--brand-light)' : 'var(--cyan)')
                  : 'var(--text-secondary)',
              }}>
                {m === 'workshop' ? 'Workshop' : 'Course'}
              </div>
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div className="section-label">Session Title</div>
          <input
            className="field-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Git Workshop 101"
            style={{ fontSize: 15 }}
          />
        </div>

        {/* Description */}
        <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
          <div className="section-label">Description (optional)</div>
          <input
            className="field-input"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief description shown to students"
          />
        </div>

        {/* Tasks (workshop mode) */}
        {mode === 'workshop' && (
          <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
            <div className="section-label">Tasks</div>
            <TaskEditor tasks={workshopTasks} onChange={setWorkshopTasks} />
          </div>
        )}

        {/* Modules (course mode) */}
        {mode === 'course' && (
          <div style={{ marginBottom: 16 }}>
            <div className="section-label">Modules</div>
            {modules.map((mod, mi) => (
              <div key={mi} className="glass" style={{ padding: 20, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <input
                    value={mod.title}
                    onChange={e => updateModule(mi, 'title', e.target.value)}
                    placeholder={`Module ${mi + 1} title`}
                    className="field-input"
                    style={{ flex: 1, borderColor: 'rgba(124,58,237,0.3)' }}
                  />
                  <input
                    value={mod.description}
                    onChange={e => updateModule(mi, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="field-input"
                    style={{ flex: 2, color: 'var(--text-muted)' }}
                  />
                </div>
                <TaskEditor tasks={mod.tasks} onChange={tasks => updateModuleTasks(mi, tasks)} />
              </div>
            ))}
            <button className="btn btn-ghost btn-full" onClick={addModule} style={{ borderStyle: 'dashed', borderColor: 'rgba(124,58,237,0.3)' }}>
              + Add Module
            </button>
          </div>
        )}

        {/* Custom Registration Fields */}
        <div className="glass" style={{ padding: 20, marginBottom: 28 }}>
          <div className="section-label">Custom Registration Fields (optional)</div>
          {customFields.map((field, i) => (
            <div key={i} style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-1)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 8,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <input
                value={field.field_label}
                onChange={e => updateField(i, { field_label: e.target.value, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="Field label (e.g. GitHub Username)"
                className="field-input"
                style={{ flex: 2, minWidth: 140 }}
              />
              <select
                value={field.field_type}
                onChange={e => updateField(i, { field_type: e.target.value as FieldType })}
                className="field-input"
                style={{ width: 100, flexShrink: 0 }}
              >
                <option value="text">Text</option>
                <option value="url">URL</option>
                <option value="select">Select</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
                <input type="checkbox" checked={field.is_required} onChange={e => updateField(i, { is_required: e.target.checked })} />
                Required
              </label>
              <button
                onClick={() => removeField(i)}
                className="btn btn-sm"
                style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' }}
              >✕</button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addField} style={{ marginTop: 4 }}>
            + Add Registration Field
          </button>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={handleCreate}
          disabled={loading || !title.trim()}
          style={{ padding: '18px', fontSize: 17 }}
        >
          {loading ? '⏳ Creating…' : '🚀 Launch Session'}
        </button>
      </div>
    </div>
  )
}
