import type { Level } from './types'

export const AVATARS = [
  '🦊','🐼','🦄','🐸','🐯','🦁','🐺','🐻',
  '🦋','🐙','🦖','🤖','👾','🧙','🥷','🦸',
]

export const LEVELS: Level[] = [
  { name: 'Newbie',     min: 0,    color: '#6b7280', icon: '🌱' },
  { name: 'Apprentice', min: 200,  color: '#3b82f6', icon: '⚡' },
  { name: 'Developer',  min: 500,  color: '#8b5cf6', icon: '💻' },
  { name: 'Hacker',     min: 1000, color: '#f59e0b', icon: '🔥' },
  { name: 'Wizard',     min: 2000, color: '#ef4444', icon: '🧙' },
]

export const STATUS_COLOR: Record<string, string> = {
  done:    '#10b981',
  working: '#f59e0b',
  stuck:   '#ef4444',
  idle:    '#374151',
}

export const STATUS_ICON: Record<string, string> = {
  done:    '✅',
  working: '⚡',
  stuck:   '🆘',
  idle:    '💤',
}
