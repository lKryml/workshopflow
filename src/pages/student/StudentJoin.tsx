import { useState } from 'react'
import { supabase } from '../../supabase'
import { AVATARS } from '../../constants'
import type { Session, SessionField, Student, Task } from '../../types'

type JoinStep = 'code' | 'register'

export function StudentJoin({
  onJoined,
}: {
  onJoined: (student: Student, session: Session, tasks: Task[]) => void
}) {
  const [step, setStep] = useState<JoinStep>('code')
  const [code, setCode] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  const [foundSession, setFoundSession] = useState<Session | null>(null)
  const [foundTasks, setFoundTasks] = useState<Task[]>([])
  const [customFields, setCustomFields] = useState<SessionField[]>([])

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🦊')
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
    setStep('register')
  }

  // Bug #8: "Try Again" resets all state
  const handleReset = () => {
    setStep('code')
    setCode('')
    setCodeError('')
    setFoundSession(null)
    setFoundTasks([])
    setCustomFields([])
    setName('')
    setAvatar('🦊')
    setEmail('')
    setGithub('')
    setPhone('')
    setFieldValues({})
    setRegisterError('')
  }

  const handleRegister = async () => {
    if (!name.trim() || !foundSession) return

    // Validate required custom fields
    for (const field of customFields) {
      if (field.is_required && !fieldValues[field.field_key]?.trim()) {
        setRegisterError(`"${field.field_label}" is required.`)
        return
      }
    }

    setRegisterLoading(true)
    setRegisterError('')

    // Bug #17: insert level as text 'Newbie', not number 1
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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', background: '#13131f',
    border: '1px solid #2d2d50', borderRadius: 12, color: '#e2e8f0',
    fontSize: 15, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0533 50%, #0f0f1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {step === 'code' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎮</div>
              <h2 style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800, margin: 0 }}>Join Workshop</h2>
              <p style={{ color: '#64748b', marginTop: 8 }}>Enter the code from your instructor.</p>
            </div>

            <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 20, padding: 28 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>JOIN CODE</label>
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="e.g. XK9F2M"
                maxLength={8}
                style={{
                  ...inputStyle,
                  color: '#a78bfa', fontSize: 28, fontWeight: 900,
                  letterSpacing: 8, textAlign: 'center', marginBottom: 16,
                }}
              />
              {codeError && (
                <div style={{
                  background: '#ef444422', borderRadius: 10, padding: '10px 14px',
                  color: '#fca5a5', fontSize: 14, marginBottom: 16,
                }}>{codeError}</div>
              )}
              <button
                onClick={handleCodeSubmit}
                disabled={codeLoading || !code.trim()}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: codeLoading || !code.trim() ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: '#fff', fontSize: 16, fontWeight: 700,
                  cursor: codeLoading || !code.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: codeLoading || !code.trim() ? 'none' : '0 8px 24px #7c3aed66',
                }}
              >{codeLoading ? '⏳ Checking…' : 'Next →'}</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
              <h2 style={{ color: '#e2e8f0', fontSize: 24, fontWeight: 800, margin: 0 }}>
                {foundSession?.title}
              </h2>
              <p style={{ color: '#64748b', marginTop: 4 }}>Fill in your details to join.</p>
            </div>

            <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 20, padding: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    YOUR NAME *
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah" style={inputStyle} />
                </div>

                {/* Avatar */}
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    PICK YOUR AVATAR
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {AVATARS.map(a => (
                      <button
                        key={a}
                        onClick={() => setAvatar(a)}
                        style={{
                          width: 44, height: 44, borderRadius: 10,
                          border: a === avatar ? '2px solid #a78bfa' : '2px solid #2d2d50',
                          background: a === avatar ? '#a78bfa22' : 'transparent',
                          fontSize: 22, cursor: 'pointer', transition: 'all 0.15s',
                          boxShadow: a === avatar ? '0 0 12px #a78bfa55' : 'none',
                        }}
                      >{a}</button>
                    ))}
                  </div>
                </div>

                {/* Optional fields */}
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    EMAIL (OPTIONAL)
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    GITHUB USERNAME (OPTIONAL)
                  </label>
                  <input value={github} onChange={e => setGithub(e.target.value)} placeholder="your-handle" style={inputStyle} />
                </div>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    PHONE (OPTIONAL)
                  </label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" style={inputStyle} />
                </div>

                {/* Custom fields */}
                {customFields.map(field => (
                  <div key={field.id}>
                    <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      {field.field_label.toUpperCase()}{field.is_required ? ' *' : ' (OPTIONAL)'}
                    </label>
                    {field.field_type === 'select' ? (
                      <select
                        value={fieldValues[field.field_key] || ''}
                        onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                        style={{ ...inputStyle, color: fieldValues[field.field_key] ? '#e2e8f0' : '#4b5563' }}
                      >
                        <option value="">Select…</option>
                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.field_type === 'url' ? 'url' : 'text'}
                        value={fieldValues[field.field_key] || ''}
                        onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                        placeholder={field.field_label}
                        style={inputStyle}
                      />
                    )}
                  </div>
                ))}

                {registerError && (
                  <div style={{ background: '#ef444422', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 14 }}>
                    {registerError}
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={registerLoading || !name.trim()}
                  style={{
                    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                    background: registerLoading || !name.trim() ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                    color: '#fff', fontSize: 16, fontWeight: 700,
                    cursor: registerLoading || !name.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: registerLoading || !name.trim() ? 'none' : '0 8px 24px #7c3aed66',
                  }}
                >
                  {registerLoading ? '⏳ Joining…' : `${avatar} Enter Workshop`}
                </button>

                {/* Bug #8: Try Again resets all state */}
                <button
                  onClick={handleReset}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 10,
                    background: 'none', border: '1px solid #2d2d50',
                    color: '#64748b', fontSize: 14, cursor: 'pointer',
                  }}
                >← Try a different code</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
