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
        <div key={i} style={{
          background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16, padding: 16, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>{i + 1}</div>
            <input
              value={task.title} onChange={e => update(i, 'title', e.target.value)}
              placeholder="Task title"
              style={{
                flex: 1, padding: '10px 12px', background: '#13131f',
                border: '1px solid #2d2d50', borderRadius: 10, color: '#e2e8f0', fontSize: 15, outline: 'none',
              }}
            />
            <input
              value={task.xp} type="number" onChange={e => update(i, 'xp', Number(e.target.value))}
              style={{
                width: 80, padding: '10px 12px', background: '#13131f',
                border: '1px solid #f59e0b44', borderRadius: 10, color: '#f59e0b', fontSize: 14,
                outline: 'none', fontWeight: 700,
              }}
            />
            <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>XP</span>
            {tasks.length > 1 && (
              <button
                onClick={() => remove(i)}
                style={{
                  background: '#ef444422', border: '1px solid #ef444444',
                  borderRadius: 8, color: '#ef4444', padding: '6px 10px', cursor: 'pointer', fontSize: 14,
                }}
              >✕</button>
            )}
          </div>
          <input
            value={task.description} onChange={e => update(i, 'description', e.target.value)}
            placeholder="Short hint for students (optional)"
            style={{
              width: '100%', padding: '8px 12px', background: '#13131f',
              border: '1px solid #2d2d50', borderRadius: 10, color: '#64748b', fontSize: 13,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
      ))}
      <button
        onClick={add}
        style={{
          width: '100%', padding: '12px', background: 'transparent',
          border: '2px dashed #2d2d50', borderRadius: 12, color: '#64748b',
          fontSize: 15, cursor: 'pointer', transition: 'all 0.2s',
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#a78bfa' }}
        onMouseOut={e => { e.currentTarget.style.borderColor = '#2d2d50'; e.currentTarget.style.color = '#64748b' }}
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
      // Course mode: insert modules then tasks per module
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

    // Insert custom registration fields
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

  const labelStyle: React.CSSProperties = { color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }

  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0533 50%, #0f0f1a 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 24, display: 'flex', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 720, paddingTop: 40, paddingBottom: 60 }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Create New Session</h2>
        <p style={{ color: '#64748b', marginBottom: 32 }}>Set up your tasks, register fields, and launch.</p>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', background: '#1e1e35', borderRadius: 12, padding: 4, marginBottom: 28, maxWidth: 320 }}>
          {(['workshop', 'course'] as SessionMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer',
                background: mode === m ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                color: mode === m ? '#fff' : '#64748b', fontWeight: 700, fontSize: 14,
              }}
            >
              {m === 'workshop' ? '🔧 Workshop' : '📚 Course'}
            </button>
          ))}
        </div>

        {/* Title */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>SESSION TITLE</label>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Git Workshop 101"
            style={{
              width: '100%', padding: '14px 16px', background: '#1e1e35',
              border: '1px solid #2d2d50', borderRadius: 12, color: '#e2e8f0',
              fontSize: 16, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 28 }}>
          <label style={labelStyle}>DESCRIPTION (OPTIONAL)</label>
          <input
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Brief description shown to students"
            style={{
              width: '100%', padding: '12px 16px', background: '#1e1e35',
              border: '1px solid #2d2d50', borderRadius: 12, color: '#e2e8f0',
              fontSize: 15, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Tasks (workshop mode) */}
        {mode === 'workshop' && (
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>TASKS</label>
            <TaskEditor tasks={workshopTasks} onChange={setWorkshopTasks} />
          </div>
        )}

        {/* Modules (course mode) */}
        {mode === 'course' && (
          <div style={{ marginBottom: 28 }}>
            <label style={labelStyle}>MODULES</label>
            {modules.map((mod, mi) => (
              <div key={mi} style={{
                background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 16, padding: 20, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <input
                    value={mod.title} onChange={e => updateModule(mi, 'title', e.target.value)}
                    placeholder={`Module ${mi + 1} title`}
                    style={{
                      flex: 1, padding: '10px 14px', background: '#13131f',
                      border: '1px solid #3d2d6e', borderRadius: 10, color: '#e2e8f0', fontSize: 15, outline: 'none',
                    }}
                  />
                  <input
                    value={mod.description} onChange={e => updateModule(mi, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    style={{
                      flex: 2, padding: '10px 14px', background: '#13131f',
                      border: '1px solid #2d2d50', borderRadius: 10, color: '#64748b', fontSize: 13, outline: 'none',
                    }}
                  />
                </div>
                <TaskEditor tasks={mod.tasks} onChange={tasks => updateModuleTasks(mi, tasks)} />
              </div>
            ))}
            <button
              onClick={addModule}
              style={{
                width: '100%', padding: 12, background: 'transparent',
                border: '2px dashed #3d2d6e', borderRadius: 12, color: '#7c3aed',
                fontSize: 15, cursor: 'pointer',
              }}
            >+ Add Module</button>
          </div>
        )}

        {/* Custom Registration Fields */}
        <div style={{ marginBottom: 32 }}>
          <label style={labelStyle}>CUSTOM REGISTRATION FIELDS (OPTIONAL)</label>
          {customFields.map((field, i) => (
            <div key={i} style={{
              background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 12, padding: 14, marginBottom: 10,
              display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            }}>
              <input
                value={field.field_label}
                onChange={e => updateField(i, { field_label: e.target.value, field_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="Field label (e.g. GitHub Username)"
                style={{
                  flex: 2, padding: '8px 12px', background: '#13131f',
                  border: '1px solid #2d2d50', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none',
                  minWidth: 140,
                }}
              />
              <select
                value={field.field_type}
                onChange={e => updateField(i, { field_type: e.target.value as FieldType })}
                style={{
                  padding: '8px 12px', background: '#13131f', border: '1px solid #2d2d50',
                  borderRadius: 8, color: '#94a3b8', fontSize: 13, outline: 'none',
                }}
              >
                <option value="text">Text</option>
                <option value="url">URL</option>
                <option value="select">Select</option>
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={field.is_required}
                  onChange={e => updateField(i, { is_required: e.target.checked })}
                />
                Required
              </label>
              <button
                onClick={() => removeField(i)}
                style={{
                  background: '#ef444422', border: '1px solid #ef444444', borderRadius: 8,
                  color: '#ef4444', padding: '6px 10px', cursor: 'pointer', fontSize: 13,
                }}
              >✕</button>
            </div>
          ))}
          <button
            onClick={addField}
            style={{
              padding: '10px 20px', background: 'transparent',
              border: '1px dashed #2d2d50', borderRadius: 10, color: '#64748b',
              fontSize: 14, cursor: 'pointer',
            }}
          >+ Add Registration Field</button>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || !title.trim()}
          style={{
            width: '100%', padding: '16px', borderRadius: 16, border: 'none',
            cursor: loading || !title.trim() ? 'not-allowed' : 'pointer',
            background: loading || !title.trim() ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: '#fff', fontSize: 17, fontWeight: 700, marginTop: 8,
            boxShadow: loading || !title.trim() ? 'none' : '0 8px 32px #7c3aed66',
          }}
        >
          {loading ? '⏳ Creating…' : '🚀 Launch Session'}
        </button>
      </div>
    </div>
  )
}
