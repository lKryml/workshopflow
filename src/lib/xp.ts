import { LEVELS } from '../constants'
import type { Level, XPProgress } from '../types'

export function getLevel(xp: number): Level {
  return [...LEVELS].reverse().find(l => xp >= l.min) ?? LEVELS[0]
}

export function getNextLevel(xp: number): Level | null {
  const idx = LEVELS.findIndex(l => l === getLevel(xp))
  return LEVELS[idx + 1] ?? null
}

export function xpToNextLevel(xp: number): XPProgress {
  const next = getNextLevel(xp)
  const curr = getLevel(xp)
  if (!next) return { progress: 100, needed: 0, current: xp - curr.min }
  const total = next.min - curr.min
  const current = xp - curr.min
  return {
    progress: Math.round((current / total) * 100),
    needed: next.min - xp,
    current,
  }
}
