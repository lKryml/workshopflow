import { useEffect } from 'react'
import type { Level } from '../types'

export function LevelUpToast({
  level,
  onDismiss,
}: {
  level: Level | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!level) return
    const t = setTimeout(onDismiss, 3500)
    return () => clearTimeout(t)
  }, [level, onDismiss])

  if (!level) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        background: `linear-gradient(135deg, ${level.color}ee, ${level.color}bb)`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        padding: '20px 36px',
        borderRadius: 20,
        fontSize: 20,
        fontWeight: 700,
        zIndex: 10001,
        textAlign: 'center',
        boxShadow: `0 8px 40px ${level.color}66`,
        animation: 'level-toast-in 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        whiteSpace: 'nowrap',
      }}
    >
      <div>{level.icon} Level Up! You're now a <strong>{level.name}</strong></div>
      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, fontWeight: 400 }}>
        Keep crushing those tasks!
      </div>
    </div>
  )
}
