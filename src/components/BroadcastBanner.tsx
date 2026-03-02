import { useEffect } from 'react'

export function BroadcastBanner({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(124,58,237,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(124,58,237,0.5)',
        color: '#fff',
        padding: '14px 20px',
        borderRadius: 14,
        fontSize: 15,
        fontWeight: 600,
        zIndex: 10000,
        maxWidth: 520,
        width: 'calc(100vw - 48px)',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        animation: 'broadcast-in 0.3s ease-out',
      }}
    >
      <span style={{ fontSize: 18 }}>📢</span>
      <span style={{ flex: 1, textAlign: 'left', lineHeight: 1.4 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          width: 28,
          height: 28,
          background: 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 16,
          padding: 0,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background 0.15s ease',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
      >
        ×
      </button>
    </div>
  )
}
