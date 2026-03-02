import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import { AVATARS } from '../../constants'
import type { Session, SessionField, Student, Task } from '../../types'

type AuthTab = 'register' | 'signin'

const inputCls = 'w-full bg-neutral-900 border border-neutral-700 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all text-sm'

export function StudentJoin({
  onJoined,
}: {
  onJoined: (student: Student, session: Session, tasks: Task[]) => void
}) {
  const [tab, setTab] = useState<AuthTab>('register')
  const [loadingSession, setLoadingSession] = useState(true)
  const [foundSession, setFoundSession] = useState<Session | null>(null)
  const [foundTasks, setFoundTasks] = useState<Task[]>([])
  const [customFields, setCustomFields] = useState<SessionField[]>([])
  const [noSession, setNoSession] = useState(false)

  // Register fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Sign-in fields
  const [signinEmail, setSigninEmail] = useState('')
  const [signinPassword, setSigninPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLatestSession = async () => {
      const { data: sess } = await supabase
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!sess) {
        setNoSession(true)
        setLoadingSession(false)
        return
      }

      const { data: tasks } = await supabase
        .from('tasks').select('*').eq('session_id', sess.id).order('task_order')
      const { data: fields } = await supabase
        .from('session_fields').select('*').eq('session_id', sess.id).order('field_order')

      setFoundSession(sess)
      setFoundTasks(tasks || [])
      setCustomFields(fields || [])
      setLoadingSession(false)
    }

    fetchLatestSession()
  }, [])

  const handleRegister = async () => {
    if (!foundSession) return

    const first = firstName.trim()
    const last = lastName.trim()
    const emailVal = email.trim()
    const phoneVal = phone.trim()
    const passVal = password

    if (!first) { setError('الاسم الأول مطلوب.'); return }
    if (!last) { setError('اسم العائلة مطلوب.'); return }
    if (!emailVal) { setError('البريد الإلكتروني مطلوب.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailVal)) { setError('بريد إلكتروني غير صالح.'); return }
    if (!phoneVal) { setError('رقم الهاتف مطلوب.'); return }
    if (passVal.length < 6) { setError('كلمة المرور: 6 أحرف على الأقل.'); return }

    for (const field of customFields) {
      if (field.is_required && !fieldValues[field.field_key]?.trim()) {
        setError(`"${field.field_label}" مطلوب.`)
        return
      }
    }

    setLoading(true)
    setError('')

    // Create Supabase auth account
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: emailVal,
      password: passVal,
      options: { data: { display_name: `${first} ${last}` } },
    })

    if (authErr) {
      const msg = authErr.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        setError('هذا البريد مسجل مسبقاً. استخدم تبويب "دخول" أو اختر بريداً آخر.')
      } else {
        setError(authErr.message)
      }
      setLoading(false)
      return
    }

    if (!authData.session) {
      setError('تعذّر إنشاء الحساب. حاول مجددًا أو استخدم تبويب "دخول" إن كنت مسجلاً.')
      setLoading(false)
      return
    }

    // Insert student record
    const { data: studentRow, error: sErr } = await supabase
      .from('students')
      .insert({
        session_id: foundSession.id,
        name: `${first} ${last}`,
        avatar,
        total_xp: 0,
        level: 'Newbie',
        streak: 0,
        email: emailVal,
        github_username: null,
        phone: phoneVal,
        custom_fields: fieldValues,
      })
      .select()
      .single()

    if (sErr || !studentRow) {
      setError('تعذّر الانضمام للجلسة. حاول مجددًا.')
      setLoading(false)
      return
    }

    setLoading(false)
    onJoined(studentRow, foundSession, foundTasks)
  }

  const handleSignIn = async () => {
    const emailVal = signinEmail.trim()
    const passVal = signinPassword

    if (!emailVal) { setError('البريد الإلكتروني مطلوب.'); return }
    if (!passVal) { setError('كلمة المرور مطلوبة.'); return }

    setLoading(true)
    setError('')

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passVal,
    })

    if (authErr) {
      setError('بريد إلكتروني أو كلمة مرور غير صحيحة.')
      setLoading(false)
      return
    }

    // Look up their most recent student record
    const { data: studentRow } = await supabase
      .from('students')
      .select('*')
      .eq('email', emailVal)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!studentRow) {
      setError('لم يُعثر على حساب. سجّل من تبويب "تسجيل".')
      setLoading(false)
      return
    }

    // Fetch their session and tasks
    const { data: sess } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', studentRow.session_id)
      .single()

    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('session_id', studentRow.session_id)
      .order('task_order')

    if (!sess) {
      setError('لم يُعثر على الجلسة.')
      setLoading(false)
      return
    }

    setLoading(false)
    onJoined(studentRow, sess, tasks || [])
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-neutral-600 font-mono text-sm">جارٍ التحميل...</div>
      </div>
    )
  }

  if (noSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h1 className="text-xl font-bold text-white mb-2">لا توجد جلسة نشطة</h1>
          <p className="text-neutral-500 text-sm">انتظر المدرب لإنشاء الجلسة ثم أعد تحميل الصفحة.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 border border-neutral-700 hover:border-neutral-600 text-neutral-400 hover:text-neutral-300 text-sm px-5 py-2.5 rounded-sm transition-colors"
          >
            إعادة المحاولة ↺
          </button>
        </div>
      </div>
    )
  }

  const requiredCustomFields = customFields.filter(f => f.is_required)
  const optionalCustomFields = customFields.filter(f => !f.is_required)

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 block" style={{ textShadow: '0 0 40px rgba(249,115,22,0.5)' }}>⚡</div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">GitHub Workshop</h1>
          <div className="text-orange-400 font-semibold text-base">{foundSession?.title}</div>
          <p className="text-neutral-500 text-sm mt-1">احجز مقعدك في الورشة</p>
        </div>

        <div className="bg-[#0a0a0a] border border-neutral-700 rounded-xl overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-neutral-800">
            {(['register', 'signin'] as AuthTab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-3.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  tab === t
                    ? 'border-orange-500 text-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {t === 'register' ? 'تسجيل جديد' : 'دخول'}
              </button>
            ))}
          </div>

          <div className="p-6 flex flex-col gap-5">
            {tab === 'register' ? (
              <>
                {/* First + Last Name Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                      الاسم الأول <span className="text-orange-500">*</span>
                    </label>
                    <input
                      className={inputCls}
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="مثال: سارة"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                      اسم العائلة <span className="text-orange-500">*</span>
                    </label>
                    <input
                      className={inputCls}
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="مثال: الأحمدي"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    البريد الإلكتروني <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={inputCls}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    dir="ltr"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    رقم الهاتف <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className={inputCls}
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+966 5X XXX XXXX"
                    dir="ltr"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    كلمة المرور <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="password"
                    className={inputCls}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <p className="text-neutral-600 text-xs mt-1.5 font-mono">٦ أحرف على الأقل — ستحتاجها للدخول لاحقاً</p>
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

                {/* Required instructor custom fields */}
                {requiredCustomFields.map(field => (
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

                {/* Optional instructor custom fields */}
                {optionalCustomFields.length > 0 && (
                  <div className="flex flex-col gap-4 pt-1 border-t border-neutral-800">
                    <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest pt-1">اختياري</div>
                    {optionalCustomFields.map(field => (
                      <div key={field.id}>
                        <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                          {field.field_label}
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
                  </div>
                )}
              </>
            ) : (
              /* Sign In Tab */
              <>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    البريد الإلكتروني <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="email"
                    className={inputCls}
                    value={signinEmail}
                    onChange={e => setSigninEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                    placeholder="you@example.com"
                    dir="ltr"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    كلمة المرور <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="password"
                    className={inputCls}
                    value={signinPassword}
                    onChange={e => setSigninPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-md px-3 py-2 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={tab === 'register' ? handleRegister : handleSignIn}
              disabled={loading || (tab === 'register' && (!firstName.trim() || !lastName.trim()))}
              className="w-full bg-neutral-100 hover:bg-white text-black font-bold py-3.5 rounded-sm transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm disabled:opacity-40 disabled:cursor-not-allowed mt-1"
            >
              {loading
                ? '⏳ جارٍ...'
                : tab === 'register'
                ? `${avatar} ادخل الورشة`
                : '→ دخول'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
