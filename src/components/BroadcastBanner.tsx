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
        background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
        color: '#fff',
        padding: '14px 24px',
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 600,
        zIndex: 10000,
        maxWidth: 480,
        textAlign: 'center',
        boxShadow: '0 4px 24px #0006',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <span>📢</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 18,
          padding: 0,
          lineHeight: 1,
          opacity: 0.8,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
