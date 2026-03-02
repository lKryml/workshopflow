import { useState } from 'react'
import { supabase } from '../../supabase'

type AuthTab = 'login' | 'register'

export function InstructorAuth({ onAuth }: { onAuth: () => void }) {
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
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎓</div>
          <h2 style={{ color: '#e2e8f0', fontSize: 26, fontWeight: 800, margin: 0 }}>Instructor Portal</h2>
          <p style={{ color: '#64748b', marginTop: 8 }}>Sign in to manage your workshops.</p>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: '#1e1e35', borderRadius: 12, padding: 4, marginBottom: 24,
        }}>
          {(['login', 'register'] as AuthTab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer',
                background: tab === t ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                color: tab === t ? '#fff' : '#64748b', fontWeight: 700, fontSize: 14,
                transition: 'all 0.2s',
              }}
            >
              {t === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div style={{ background: '#1e1e35', border: '1px solid #2d2d50', borderRadius: 20, padding: 28 }}>
          {magicSent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
              <p style={{ color: '#a78bfa', fontWeight: 700, fontSize: 16, margin: '0 0 8px' }}>Check your email!</p>
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>We sent a magic link to <strong style={{ color: '#e2e8f0' }}>{email}</strong></p>
              <button onClick={() => setMagicSent(false)} style={{
                marginTop: 20, background: 'none', border: '1px solid #2d2d50',
                borderRadius: 8, color: '#94a3b8', padding: '8px 16px', cursor: 'pointer', fontSize: 13,
              }}>Back</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tab === 'register' && (
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>DISPLAY NAME</label>
                  <input
                    value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>PASSWORD</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{ background: '#ef444422', borderRadius: 10, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <button
                onClick={tab === 'login' ? handleLogin : handleRegister}
                disabled={loading}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                  background: loading ? '#374151' : 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: '#fff', fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 8px 24px #7c3aed66',
                }}
              >
                {loading ? '⏳ Please wait…' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>

              <button
                onClick={handleMagicLink}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px', borderRadius: 12,
                  border: '1px solid #2d2d50', background: 'transparent',
                  color: '#94a3b8', fontSize: 14, cursor: 'pointer',
                }}
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
