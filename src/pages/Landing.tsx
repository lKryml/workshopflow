export function Landing({
  onInstructor,
  onStudent,
}: {
  onInstructor: () => void
  onStudent: () => void
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0533 50%, #0f0f1a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', 'Segoe UI', sans-serif", padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 560 }}>
        <div style={{ fontSize: 72, marginBottom: 16 }}>⚡</div>
        <h1 style={{
          fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 900, margin: '0 0 12px',
          background: 'linear-gradient(90deg, #a78bfa, #60a5fa, #f472b6)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '-2px',
        }}>WorkshopFlow</h1>
        <p style={{ color: '#94a3b8', fontSize: 18, margin: '0 0 48px', lineHeight: 1.6 }}>
          Level up your workshops. Real-time progress. Epic leaderboards.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onInstructor}
            style={{
              padding: '16px 40px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              color: '#fff', fontSize: 17, fontWeight: 700,
              boxShadow: '0 8px 32px #7c3aed66',
              transition: 'all 0.2s', letterSpacing: 0.5,
            }}
            onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseOut={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            🎓 I'm the Instructor
          </button>
          <button
            onClick={onStudent}
            style={{
              padding: '16px 40px', borderRadius: 16, border: '2px solid #3b82f6',
              cursor: 'pointer', background: 'transparent',
              color: '#60a5fa', fontSize: 17, fontWeight: 700,
              transition: 'all 0.2s',
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#3b82f622'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            🧑‍💻 I'm a Student
          </button>
        </div>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 32 }}>
          Instructor creates session → Students join with code → Everyone levels up 🚀
        </p>
      </div>
    </div>
  )
}
