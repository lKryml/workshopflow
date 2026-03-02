import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import type { Session, Student } from '../../types'

export function WaitingRoom({
  student,
  session,
  onSessionStart,
}: {
  student: Student
  session: Session
  onSessionStart: () => void
}) {
  const [studentCount, setStudentCount] = useState(0)
  const [waitingStudents, setWaitingStudents] = useState<Student[]>([])

  useEffect(() => {
    // Load initial student list
    supabase.from('students').select('*').eq('session_id', session.id)
      .then(({ data }) => {
        if (data) {
          setWaitingStudents(data)
          setStudentCount(data.length)
        }
      })

    // Watch for new students joining
    const ch = supabase.channel(`waiting-${session.id}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'students', filter: `session_id=eq.${session.id}` },
        ({ new: s }) => {
          setWaitingStudents(prev => [...prev.filter(x => x.id !== (s as Student).id), s as Student])
          setStudentCount(prev => prev + 1)
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${session.id}` },
        ({ new: updated }) => {
          if ((updated as Session).is_active) {
            onSessionStart()
          }
        })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [session.id, onSessionStart])

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative">
      {/* Subtle bg glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-orange-600/4 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-sm z-10">
        {/* Session title */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4" style={{ textShadow: '0 0 40px rgba(249,115,22,0.4)' }}>⚡</div>
          <h1 className="text-2xl font-bold text-white mb-1">{session.title}</h1>
          <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">WorkshopFlow</div>
        </div>

        {/* Student card */}
        <div className="bg-[#0a0a0a] border border-neutral-700 rounded-xl p-6 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
          <div className="flex items-center gap-4">
            <div className="text-4xl">{student.avatar}</div>
            <div>
              <div className="font-bold text-white text-base">{student.name}</div>
              <div className="text-xs text-neutral-500 mt-0.5">مسجّل ✓</div>
            </div>
          </div>
        </div>

        {/* Waiting status */}
        <div className="bg-[#0a0a0a] border border-neutral-700 rounded-xl p-6 text-center">
          {/* Pulsing dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
          <p className="text-neutral-300 font-semibold text-sm mb-1">في انتظار المدرب</p>
          <p className="text-neutral-600 text-xs">ستبدأ الجلسة قريباً...</p>

          {studentCount > 0 && (
            <div className="mt-5 pt-4 border-t border-neutral-800">
              <div className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest mb-3">
                {studentCount} مشارك في غرفة الانتظار
              </div>
              <div className="flex flex-wrap justify-center gap-1.5">
                {waitingStudents.slice(0, 16).map(s => (
                  <div
                    key={s.id}
                    title={s.name}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border transition-all ${
                      s.id === student.id
                        ? 'bg-orange-500/15 border-orange-500/40'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    {s.avatar}
                  </div>
                ))}
                {studentCount > 16 && (
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-neutral-900 border border-neutral-800 text-neutral-600 text-xs font-mono">
                    +{studentCount - 16}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
