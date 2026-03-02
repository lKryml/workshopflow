import type { Completion, Task } from '../types'

/**
 * Returns the speed badge for a student on a specific task.
 * Based on completion order (earliest completed_at wins).
 */
export function getTaskBadge(studentId: string, taskId: string, completions: Completion[]): string | null {
  const taskDone = completions
    .filter(c => c.task_id === taskId && !c.is_stuck)
    .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime())

  const rank = taskDone.findIndex(c => c.student_id === studentId)
  if (rank === 0) return '🥇'
  if (rank === 1) return '🥈'
  if (rank === 2) return '🥉'
  return null
}

/**
 * Returns '🏆' if this student was the first to complete ALL tasks in the session.
 * Determined by comparing the timestamp of each student's last task completion.
 */
export function getAllTasksBadge(studentId: string, tasks: Task[], completions: Completion[]): string | null {
  if (tasks.length === 0) return null

  // Group completions by student — find the time they finished their last task
  const studentIds = [...new Set(completions.filter(c => !c.is_stuck).map(c => c.student_id))]

  const finishTimes: { studentId: string; lastCompleted: number }[] = []

  for (const sid of studentIds) {
    const studentDone = completions.filter(c => c.student_id === sid && !c.is_stuck)
    const completedTaskIds = new Set(studentDone.map(c => c.task_id))
    const allDone = tasks.every(t => completedTaskIds.has(t.id))
    if (!allDone) continue

    const lastTime = Math.max(...studentDone.map(c => new Date(c.completed_at).getTime()))
    finishTimes.push({ studentId: sid, lastCompleted: lastTime })
  }

  if (finishTimes.length === 0) return null
  finishTimes.sort((a, b) => a.lastCompleted - b.lastCompleted)

  return finishTimes[0].studentId === studentId ? '🏆' : null
}
