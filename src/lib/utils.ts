import type { Student, Completion, Task } from '../types'

export function genCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function toYouTubeEmbed(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/)
  if (match) return `https://www.youtube.com/embed/${match[1]}`
  return url
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function exportStudentsToCSV(
  students: Student[],
  completions: Completion[],
  tasks: Task[],
  sessionTitle: string,
): void {
  const headers = [
    'Name', 'Avatar', 'Email', 'GitHub', 'Phone',
    'XP', 'Level', 'Tasks Completed', 'Total Tasks',
  ]

  // Collect all custom field keys from all students
  const allCustomKeys = Array.from(
    new Set(students.flatMap(s => Object.keys(s.custom_fields ?? {})))
  )

  const allHeaders = [...headers, ...allCustomKeys]

  const rows = students.map(s => {
    const done = completions.filter(c => c.student_id === s.id && !c.is_stuck).length
    const base = [
      s.name,
      s.avatar,
      s.email ?? '',
      s.github_username ?? '',
      s.phone ?? '',
      String(s.total_xp),
      s.level,
      String(done),
      String(tasks.length),
    ]
    const custom = allCustomKeys.map(k => (s.custom_fields ?? {})[k] ?? '')
    return [...base, ...custom]
  })

  const csvContent = [allHeaders, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sessionTitle.replace(/\s+/g, '_')}_students.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
