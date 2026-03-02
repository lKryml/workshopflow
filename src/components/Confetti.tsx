import { useEffect, useState } from 'react'

const COLORS = ['#f59e0b', '#8b5cf6', '#3b82f6', '#ef4444', '#10b981', '#ec4899']

type Particle = {
  id: number
  color: string
  size: number
  x: number
  y: number
  tx: string
  ty: string
  rot: string
}

export function Confetti({ trigger }: { trigger: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!trigger) return
    const p: Particle[] = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      x: Math.random() * 100,
      y: Math.random() * 40 + 30,
      tx: `${Math.random() * 300 - 150}px`,
      ty: `${Math.random() * 300 + 100}px`,
      rot: `${Math.random() * 720 - 360}deg`,
    }))
    setParticles(p)
    const t = setTimeout(() => setParticles([]), 2000)
    return () => clearTimeout(t)
  }, [trigger])

  if (!particles.length) return null

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {particles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: 2,
            background: p.color,
            animation: 'confetti-fly 1.8s ease-out forwards',
            // per-particle random destinations via CSS custom properties
            ['--tx' as string]: p.tx,
            ['--ty' as string]: p.ty,
            ['--rot' as string]: p.rot,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fly {
          0%   { opacity: 1; transform: translate(0, 0) rotate(0deg); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) rotate(var(--rot)); }
        }
      `}</style>
    </div>
  )
}
