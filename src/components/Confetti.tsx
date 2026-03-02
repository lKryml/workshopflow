import { useEffect, useState } from 'react'

const COLORS = [
  '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444',
  '#10b981', '#ec4899', '#a78bfa', '#fbbf24',
  '#34d399', '#f472b6',
]

type Shape = 'circle' | 'square' | 'rect'

type Particle = {
  id: number
  color: string
  shape: Shape
  width: number
  height: number
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
    const shapes: Shape[] = ['circle', 'square', 'rect']
    const p: Particle[] = Array.from({ length: 100 }, (_, i) => {
      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      const base = Math.random() * 8 + 4
      return {
        id: i,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape,
        width: shape === 'rect' ? base * 2.5 : base,
        height: base,
        x: Math.random() * 100,
        y: Math.random() * 40 + 20,
        tx: `${Math.random() * 360 - 180}px`,
        ty: `${Math.random() * 400 + 100}px`,
        rot: `${Math.random() * 720 - 360}deg`,
      }
    })
    setParticles(p)
    const t = setTimeout(() => setParticles([]), 2500)
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
            width: p.width,
            height: p.height,
            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'square' ? 2 : 1,
            background: p.color,
            boxShadow: `${p.color}60 0 0 3px`,
            animation: 'confetti-burst 2.5s ease-out forwards',
            ['--tx' as string]: p.tx,
            ['--ty' as string]: p.ty,
            ['--rot' as string]: p.rot,
          }}
        />
      ))}
    </div>
  )
}
