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
      className="fixed z-[9998] pointer-events-none font-mono font-black tabular-nums select-none"
      style={{
        top: '40%',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 40,
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'xp-float 1.8s ease-out forwards',
        letterSpacing: '-0.02em',
      }}
    >
      +{xp} XP ⚡
    </div>
  )
}
