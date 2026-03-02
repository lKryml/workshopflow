import { useEffect, useState } from 'react'

export function XPFloat({ xp, show }: { xp: number; show: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 1500)
    return () => clearTimeout(t)
  }, [show])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '40%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 32,
        fontWeight: 900,
        color: '#f59e0b',
        zIndex: 9998,
        animation: 'xpfloat 1.5s ease-out forwards',
        pointerEvents: 'none',
        textShadow: '0 0 20px #f59e0b88',
      }}
    >
      +{xp} XP ⚡
      <style>{`
        @keyframes xpfloat {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-80px); }
        }
      `}</style>
    </div>
  )
}
