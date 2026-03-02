import type { Level } from './types'

export const AVATARS = [
  '🦊','🐼','🦄','🐸','🐯','🦁','🐺','🐻',
  '🦋','🐙','🦖','🤖','👾','🧙','🥷','🦸',
]

export const LEVELS: Level[] = [
  { name: 'مبتدئ',   min: 0,    color: '#6b7280', icon: '🌱' },
  { name: 'متعلم',   min: 200,  color: '#f97316', icon: '⚡' },
  { name: 'مطور',    min: 500,  color: '#eab308', icon: '💻' },
  { name: 'محترف',   min: 1000, color: '#f59e0b', icon: '🔥' },
  { name: 'خبير',    min: 2000, color: '#ef4444', icon: '🧙' },
]

export const STATUS_COLOR: Record<string, string> = {
  done:    '#22c55e',
  working: '#f97316',
  stuck:   '#ef4444',
  idle:    '#374151',
}

export const STATUS_ICON: Record<string, string> = {
  done:    '✓',
  working: '←',
  stuck:   '!',
  idle:    '—',
}
