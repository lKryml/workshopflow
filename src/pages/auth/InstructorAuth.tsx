import { useState } from 'react'
import { supabase } from '../../supabase'

type AuthTab = 'login' | 'register'

export function InstructorAuth({
  onAuth,
  onBack,
}: {
  onAuth: () => void
  onBack: () => void
}) {
  const [tab, setTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    onAuth()
  }

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) return
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { display_name: displayName } },
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onAuth()
  }

  const handleMagicLink = async () => {
    if (!email.trim()) { setError('أدخل بريدك الإلكتروني أولاً'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (err) { setError(err.message); return }
    setMagicSent(true)
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative"
    >
      {/* Subtle bg glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Back */}
      <button
        onClick={onBack}
        className="absolute top-5 right-6 text-xs font-mono text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest flex items-center gap-1"
      >
        ← انضمام لورشة
      </button>

      <div className="w-full max-w-md z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-full mb-4">
            <span className="text-xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">بوابة المدرب</h1>
          <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
            Instructor Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-800 mb-6">
          {(['login', 'register'] as AuthTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              className={`flex-1 pb-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                tab === t
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {t === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />

          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <p className="text-orange-400 font-bold text-base mb-2">تحقق من بريدك الإلكتروني</p>
              <p className="text-neutral-500 text-sm">
                أرسلنا رابط الدخول إلى{' '}
                <span className="font-mono text-neutral-300">{email}</span>
              </p>
              <button
                onClick={() => setMagicSent(false)}
                className="mt-6 text-xs font-mono text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest"
              >
                ← العودة
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                    الاسم <span className="text-orange-500">*</span>
                  </label>
                  <input
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all font-mono text-sm"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Ahmed Ali"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                  البريد الإلكتروني <span className="text-orange-500">*</span>
                </label>
                <input
                  type="email"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all font-mono text-sm"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  dir="ltr"
                />
                <p className="text-[10px] text-neutral-600 mt-1.5 font-mono">
                  System credentials sent to this address
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wider">
                  كلمة المرور <span className="text-orange-500">*</span>
                </label>
                <input
                  type="password"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-md px-4 py-3 text-neutral-200 placeholder-neutral-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition-all font-mono text-sm"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800/50 rounded-md px-4 py-3 text-red-400 text-sm animate-fade-in">
                  {error}
                </div>
              )}

              <button
                className="w-full bg-neutral-100 hover:bg-white text-black font-bold py-3 rounded-sm transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
                onClick={tab === 'login' ? handleLogin : handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <>جاري التحقق...</>
                ) : tab === 'login' ? (
                  <>تسجيل الدخول</>
                ) : (
                  <>إنشاء الحساب</>
                )}
              </button>

              <button
                className="w-full border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-300 py-3 rounded-sm transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                onClick={handleMagicLink}
                disabled={loading}
              >
                🔗 إرسال رابط الدخول
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
