import { useState } from 'react'
import { supabase } from '../../supabase'
import { AVATARS } from '../../constants'
import type { Session, SessionField, Student, Task } from '../../types'

type JoinStep = 'code' | 'register'

export function StudentJoin({
  onJoined,
  onInstructorPortal,
}: {
  onJoined: (student: Student, session: Session, tasks: Task[]) => void
  onInstructorPortal: () => void
}) {
  const [step, setStep] = useState<JoinStep>('code')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  const [foundSession, setFoundSession] = useState<Session | null>(null)
  const [foundTasks, setFoundTasks] = useState<Task[]>([])
  const [customFields, setCustomFields] = useState<SessionField[]>([])

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [showContact, setShowContact] = useState(false)
  const [email, setEmail] = useState('')
  const [github, setGithub] = useState('')
  const [phone, setPhone] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  const [registerLoading, setRegisterLoading] = useState(false)
  const [registerError, setRegisterError] = useState('')

  const handleCodeSubmit = async () => {
    if (!code.trim()) return
    setCodeLoading(true)
    setCodeError('')
    const { data: sess } = await supabase
      .from('sessions').select('*').eq('join_code', code.toUpperCase().trim()).single()
    if (!sess) {
      setCodeError('Session not found. Check your code and try again.')
      setCodeLoading(false)
      return
    }
    const { data: tasks } = await supabase
      .from('tasks').select('*').eq('session_id', sess.id).order('task_order')
    const { data: fields } = await supabase
      .from('session_fields').select('*').eq('session_id', sess.id).order('field_order')

    setFoundSession(sess)
    setFoundTasks(tasks || [])
    setCustomFields(fields || [])
    setCodeLoading(false)

    // Animated transition
    setIsTransitioning(true)
    setTimeout(() => {
      setStep('register')
      setIsTransitioning(false)
    }, 320)
  }

  const handleReset = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      setStep('code')
      setIsTransitioning(false)
      setCode('')
      setCodeError('')
      setFoundSession(null)
      setFoundTasks([])
      setCustomFields([])
      setName('')
      setAvatar('🦊')
      setShowContact(false)
      setEmail('')
      setGithub('')
      setPhone('')
      setFieldValues({})
      setRegisterError('')
    }, 200)
  }

  const handleRegister = async () => {
    if (!name.trim() || !foundSession) return

    for (const field of customFields) {
      if (field.is_required && !fieldValues[field.field_key]?.trim()) {
        setRegisterError(`"${field.field_label}" is required.`)
        return
      }
    }

    setRegisterLoading(true)
    setRegisterError('')

    const { data: student, error: sErr } = await supabase
      .from('students')
      .insert({
        session_id: foundSession.id,
        name: name.trim(),
        avatar,
        total_xp: 0,
        level: 'Newbie',
        streak: 0,
        email: email.trim() || null,
        github_username: github.trim() || null,
        phone: phone.trim() || null,
        custom_fields: fieldValues,
      })
      .select()
      .single()

    if (sErr || !student) {
      setRegisterError('Could not join session. Please try again.')
      setRegisterLoading(false)
      return
    }

    setRegisterLoading(false)
    onJoined(student, foundSession, foundTasks)
  }

  return (
    <div
      className="bg-base bg-space bg-animated"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
      }}
    >
      {/* Instructor Portal link */}
      <button
        onClick={onInstructorPortal}
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'var(--transition-fast)',
          padding: '6px 10px',
          borderRadius: 8,
        }}
        onMouseOver={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
        onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        Instructor Portal →
      </button>

      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Step 1: Code entry */}
        {step === 'code' && (
          <div style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(-16px)' : 'translateY(0)',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            animation: isTransitioning ? undefined : 'slide-in-up 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{
                fontSize: 56,
                marginBottom: 16,
                textShadow: '0 0 40px rgba(124,58,237,0.6)',
                display: 'block',
              }}>⚡</div>
              <h1 className="gradient-text" style={{
                margin: '0 0 10px',
                fontSize: 'clamp(2.2rem,5vw,3rem)',
                fontWeight: 900,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}>WorkshopFlow</h1>
              <p style={{
                color: 'var(--text-secondary)',
                margin: 0,
                fontSize: 15,
              }}>Enter your join code to get started</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="code-input"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="XXXXXX"
                maxLength={8}
                autoFocus
              />

              {codeError && <div className="error-box">{codeError}</div>}

              <button
                className="btn btn-primary btn-full"
                onClick={handleCodeSubmit}
                disabled={codeLoading || !code.trim()}
                style={{ padding: '14px', fontSize: 16, marginTop: 4 }}
              >
                {codeLoading ? '⏳ Checking…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Character creation */}
        {step === 'register' && (
          <div style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(16px)' : 'translateY(0)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            animation: isTransitioning ? undefined : 'slide-in-up 0.35s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>👋 Joining:</div>
              <h2 className="gradient-text" style={{
                margin: 0, fontSize: 22, fontWeight: 800,
              }}>{foundSession?.title}</h2>
            </div>

            <div className="glass glass-raised" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Name */}
              <div>
                <label className="field-label">Your Name *</label>
                <input
                  className="field-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sarah"
                  autoFocus
                />
              </div>

              {/* Avatar */}
              <div>
                <label className="field-label">Pick Your Avatar</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      className={`avatar-btn${a === avatar ? ' selected' : ''}`}
                      onClick={() => setAvatar(a)}
                    >{a}</button>
                  ))}
                </div>
              </div>

              {/* Required custom fields */}
              {customFields.filter(f => f.is_required).map(field => (
                <div key={field.id}>
                  <label className="field-label">{field.field_label} *</label>
                  {field.field_type === 'select' ? (
                    <select
                      className="field-input"
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.field_type === 'url' ? 'url' : 'text'}
                      className="field-input"
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                      placeholder={field.field_label}
                    />
                  )}
                </div>
              ))}

              {/* Optional contact info toggle */}
              <button
                className="btn btn-ghost btn-full btn-sm"
                onClick={() => setShowContact(v => !v)}
                style={{ justifyContent: 'flex-start' }}
              >
                {showContact ? '▾' : '▸'} {showContact ? 'Hide' : 'Add'} contact info (optional)
              </button>

              {showContact && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, animation: 'slide-in-up 0.25s ease' }}>
                  <div>
                    <label className="field-label">Email</label>
                    <input type="email" className="field-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="field-label">GitHub Username</label>
                    <input className="field-input" value={github} onChange={e => setGithub(e.target.value)} placeholder="your-handle" />
                  </div>
                  <div>
                    <label className="field-label">Phone</label>
                    <input type="tel" className="field-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
                  </div>
                </div>
              )}

              {/* Optional custom fields */}
              {customFields.filter(f => !f.is_required).map(field => (
                <div key={field.id}>
                  <label className="field-label">{field.field_label} (optional)</label>
                  {field.field_type === 'select' ? (
                    <select
                      className="field-input"
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.field_type === 'url' ? 'url' : 'text'}
                      className="field-input"
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                      placeholder={field.field_label}
                    />
                  )}
                </div>
              ))}

              {registerError && <div className="error-box">{registerError}</div>}

              <button
                className="btn btn-primary btn-full"
                onClick={handleRegister}
                disabled={registerLoading || !name.trim()}
                style={{ padding: '14px', fontSize: 16 }}
              >
                {registerLoading ? '⏳ Joining…' : `${avatar} Enter Workshop`}
              </button>

              <button
                className="btn btn-ghost btn-full btn-sm"
                onClick={handleReset}
              >
                ← Try a different code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
