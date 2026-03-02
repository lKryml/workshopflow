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
      className="level-toast-in fixed bottom-8 left-1/2 -translate-x-1/2 z-[10001] px-9 py-5 rounded-2xl text-white text-center font-bold backdrop-blur-md border border-white/20 whitespace-nowrap"
      style={{
        background: `linear-gradient(135deg, ${level.color}ee, ${level.color}aa)`,
        boxShadow: `0 8px 40px ${level.color}66`,
      }}
    >
      <div className="text-xl">{level.icon} ارتقيت! أنت الآن <strong>{level.name}</strong></div>
      <div className="text-sm opacity-80 mt-2 font-normal">واصل التقدم وأنهِ المهام!</div>
    </div>
  )
}
