import { useState } from 'react'
import { supabase } from '../../supabase'
import { AVATARS } from '../../constants'
import type { Session, SessionField, Student, Task } from '../../types'

type JoinStep = 'code' | 'register'

const inputCls = 'w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all text-sm'

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
      setCodeError('لم يتم إيجاد الجلسة. تحقق من الكود وحاول مجددًا.')
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
        setRegisterError(`"${field.field_label}" مطلوب.`)
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
      setRegisterError('تعذّر الانضمام للجلسة. حاول مجددًا.')
      setRegisterLoading(false)
      return
    }

    setRegisterLoading(false)
    onJoined(student, foundSession, foundTasks)
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative">

      {/* Instructor Portal link */}
      <button
        onClick={onInstructorPortal}
        className="absolute top-5 left-6 text-[13px] font-semibold text-neutral-600 hover:text-neutral-400 transition-colors px-3 py-1.5 rounded-sm"
      >
        ← بوابة المدرسين
      </button>

      <div className="w-full max-w-[440px]">

        {/* Step 1: Code entry */}
        {step === 'code' && (
          <div
            className="transition-all duration-300"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? 'translateY(-16px)' : 'translateY(0)',
            }}
          >
            <div className="text-center mb-10">
              <div className="text-5xl mb-4 block" style={{ textShadow: '0 0 40px rgba(249,115,22,0.5)' }}>⚡</div>
              <h1 className="text-4xl font-black text-white tracking-tight mb-2">WorkshopFlow</h1>
              <p className="text-neutral-500 text-sm">أدخل كود الانضمام للبدء</p>
            </div>

            <div className="flex flex-col gap-3">
              <input
                className="code-input w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-4 text-center outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setCodeError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                placeholder="XXXXXX"
                maxLength={8}
                autoFocus
              />

              {codeError && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2 text-red-400 text-xs">
                  {codeError}
                </div>
              )}

              <button
                onClick={handleCodeSubmit}
                disabled={codeLoading || !code.trim()}
                className="w-full bg-neutral-100 hover:bg-white text-black font-bold py-3.5 rounded-sm transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-40 disabled:cursor-not-allowed mt-1"
              >
                {codeLoading ? '⏳ جارٍ التحقق...' : 'متابعة ←'}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Character creation */}
        {step === 'register' && (
          <div
            className="transition-all duration-300"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transform: isTransitioning ? 'translateY(16px)' : 'translateY(0)',
            }}
          >
            <div className="text-center mb-6">
              <div className="text-2xl mb-1">👋 انضمام إلى:</div>
              <h2 className="text-xl font-bold text-orange-400">{foundSession?.title}</h2>
            </div>

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-6 flex flex-col gap-5">

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                  اسمك <span className="text-orange-500">*</span>
                </label>
                <input
                  className={inputCls}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="مثال: سارة"
                  autoFocus
                />
              </div>

              {/* Avatar */}
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                  اختر صورتك
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`w-10 h-10 text-xl rounded-lg transition-all ${
                        a === avatar
                          ? 'bg-orange-500/15 border border-orange-500/50 scale-110'
                          : 'hover:bg-neutral-800 border border-transparent'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Required custom fields */}
              {customFields.filter(f => f.is_required).map(field => (
                <div key={field.id}>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    {field.field_label} <span className="text-orange-500">*</span>
                  </label>
                  {field.field_type === 'select' ? (
                    <select
                      className={inputCls}
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                    >
                      <option value="">اختر...</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.field_type === 'url' ? 'url' : 'text'}
                      className={inputCls}
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                      placeholder={field.field_label}
                    />
                  )}
                </div>
              ))}

              {/* Optional contact info toggle */}
              <button
                onClick={() => setShowContact(v => !v)}
                className="text-right text-xs font-mono text-neutral-600 hover:text-neutral-400 transition-colors uppercase tracking-wider"
              >
                {showContact ? '▾ إخفاء' : '▸ إضافة'} معلومات التواصل (اختياري)
              </button>

              {showContact && (
                <div className="flex flex-col gap-4 animate-slide-up">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">البريد الإلكتروني</label>
                    <input type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">اسم المستخدم على GitHub</label>
                    <input className={inputCls} value={github} onChange={e => setGithub(e.target.value)} placeholder="your-handle" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">رقم الهاتف</label>
                    <input type="tel" className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" />
                  </div>
                </div>
              )}

              {/* Optional custom fields */}
              {customFields.filter(f => !f.is_required).map(field => (
                <div key={field.id}>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    {field.field_label} (اختياري)
                  </label>
                  {field.field_type === 'select' ? (
                    <select
                      className={inputCls}
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                    >
                      <option value="">اختر...</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.field_type === 'url' ? 'url' : 'text'}
                      className={inputCls}
                      value={fieldValues[field.field_key] || ''}
                      onChange={e => setFieldValues(p => ({ ...p, [field.field_key]: e.target.value }))}
                      placeholder={field.field_label}
                    />
                  )}
                </div>
              ))}

              {registerError && (
                <div className="bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2 text-red-400 text-xs">
                  {registerError}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={registerLoading || !name.trim()}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-sm transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(234,88,12,0.25)]"
              >
                {registerLoading ? '⏳ جارٍ الانضمام...' : `${avatar} ادخل الورشة`}
              </button>

              <button
                onClick={handleReset}
                className="w-full border border-neutral-800 hover:border-neutral-700 text-neutral-500 hover:text-neutral-400 text-sm px-4 py-2 rounded-sm transition-colors"
              >
                ← جرّب كودًا آخر
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
