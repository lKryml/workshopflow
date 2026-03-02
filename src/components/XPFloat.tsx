import { useEffect, useState } from 'react'

export function XPFloat({ xp, show }: { xp: number; show: boolean }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!show) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 1800)
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
        fontSize: 40,
        fontWeight: 900,
        background: 'linear-gradient(135deg, #f59e0b, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        zIndex: 9998,
        animation: 'xp-float-pro 1.8s ease-out forwards',
        pointerEvents: 'none',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '-0.02em',
      }}
    >
      +{xp} XP ⚡
    </div>
  )
}
