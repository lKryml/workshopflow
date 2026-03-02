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
    if (!email.trim()) { setError('Enter your email first'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)
    if (err) { setError(err.message); return }
    setMagicSent(true)
  }

  return (
    <div
      className="bg-base bg-space bg-animated"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
      }}
    >
      {/* Back button */}
      <button
        className="btn btn-ghost btn-sm"
        onClick={onBack}
        style={{ position: 'absolute', top: 20, left: 24 }}
      >
        ← Join a workshop
      </button>

      <div style={{ width: '100%', maxWidth: 420, animation: 'slide-in-up 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800 }}>Instructor Portal</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 14 }}>
            Sign in to manage your workshops.
          </p>
        </div>

        {/* Underline tab switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-1)',
          marginBottom: 24,
          gap: 0,
        }}>
          {(['login', 'register'] as AuthTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1,
                padding: '10px 0',
                border: 'none',
                borderBottom: tab === t ? '2px solid var(--brand)' : '2px solid transparent',
                background: 'transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: tab === t ? 700 : 500,
                fontSize: 14,
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                marginBottom: -1,
              }}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div className="glass glass-raised" style={{ padding: 28 }}>
          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
              <p style={{ color: 'var(--brand-light)', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>
                Check your email!
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                We sent a magic link to{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
              </p>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setMagicSent(false)}
                style={{ marginTop: 20 }}
              >
                Back
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tab === 'register' && (
                <div>
                  <label className="field-label">Display Name</label>
                  <input
                    className="field-input"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                  />
                </div>
              )}
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  className="field-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input
                  type="password"
                  className="field-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && (tab === 'login' ? handleLogin() : handleRegister())}
                />
              </div>

              {error && <div className="error-box">{error}</div>}

              <button
                className="btn btn-primary btn-full"
                onClick={tab === 'login' ? handleLogin : handleRegister}
                disabled={loading}
                style={{ padding: '14px', fontSize: 15 }}
              >
                {loading ? '⏳ Please wait…' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>

              <button
                className="btn btn-ghost btn-full"
                onClick={handleMagicLink}
                disabled={loading}
              >
                🔗 Send magic link instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
