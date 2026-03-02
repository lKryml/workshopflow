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
    const t = setTimeout(onDismiss, 3000)
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
        background: `linear-gradient(135deg, ${level.color}dd, ${level.color})`,
        color: '#fff',
        padding: '16px 28px',
        borderRadius: 16,
        fontSize: 18,
        fontWeight: 700,
        zIndex: 10001,
        textAlign: 'center',
        boxShadow: `0 4px 32px ${level.color}88`,
        animation: 'popUp 0.4s cubic-bezier(0.175,0.885,0.32,1.275)',
        whiteSpace: 'nowrap',
      }}
    >
      {level.icon} Level Up! You're now a <strong>{level.name}</strong>
      <style>{`
        @keyframes popUp {
          from { opacity: 0; transform: translateX(-50%) scale(0.7); }
          to   { opacity: 1; transform: translateX(-50%) scale(1); }
        }
      `}</style>
    </div>
  )
}
