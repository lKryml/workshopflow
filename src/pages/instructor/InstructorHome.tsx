import { useEffect, useState } from 'react'
import { supabase } from '../../supabase'
import type { Session, Task } from '../../types'

export function InstructorHome({
  onNewWorkshop,
  onOpenSession,
}: {
  onNewWorkshop: () => void
  onOpenSession: (session: Session, tasks: Task[]) => void
}) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [instructorName, setInstructorName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setInstructorName(user.user_metadata?.display_name ?? user.email ?? '')
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('instructor_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setSessions(data)
      setLoading(false)
    })
  }, [])

  const handleOpen = async (session: Session) => {
    const { data: tasks } = await supabase
      .from('tasks').select('*').eq('session_id', session.id).order('task_order')
    onOpenSession(session, tasks || [])
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505]">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-[#050505]/90 backdrop-blur-sm border-b border-neutral-900 px-6 h-14 flex items-center gap-3">
        <span className="text-lg">⚡</span>
        <span className="font-bold text-white text-base flex-1">WorkshopFlow</span>
        {instructorName && (
          <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-wider hidden md:block">
            {instructorName}
          </span>
        )}
        <button
          onClick={handleSignOut}
          className="text-xs font-mono text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-widest"
        >
          خروج
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-1 rounded text-[10px] tracking-wider font-mono font-bold bg-neutral-900 text-orange-500 border border-orange-900/30 uppercase">
                WorkshopFlow
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">جلساتك</h1>
            <p className="text-neutral-500 text-sm">أنشئ ورشة جديدة أو افتح جلسة سابقة</p>
          </div>
          <button
            onClick={onNewWorkshop}
            className="bg-neutral-100 hover:bg-white text-black font-bold px-5 py-2.5 rounded-sm transition-all hover:-translate-y-0.5 active:translate-y-0 text-sm flex items-center gap-2"
          >
            <span>+</span>
            <span>ورشة جديدة</span>
          </button>
        </div>

        {/* Sessions */}
        {loading ? (
          <div className="text-center text-neutral-600 py-20 font-mono text-sm">
            جارٍ التحميل...
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-[#0a0a0a] border border-dashed border-neutral-800 rounded-xl p-16 text-center">
            <div className="text-5xl mb-4">🎓</div>
            <p className="text-neutral-500 text-base mb-1">لا توجد جلسات بعد</p>
            <p className="text-neutral-700 text-sm font-mono">أنشئ ورشتك الأولى للبدء</p>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl overflow-hidden">
            {sessions.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-4 px-6 py-5 border-b border-neutral-900 last:border-0 hover:bg-neutral-900/30 transition-colors animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'both' }}
              >
                {/* Type icon */}
                <div className="w-9 h-9 rounded-md bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-lg">
                  {s.session_type === 'course' ? '📚' : '🔧'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-neutral-200 truncate">{s.title}</span>
                    <span className="font-mono text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded tracking-widest flex-shrink-0">
                      {s.join_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                      {s.session_type === 'course' ? 'دورة تدريبية' : 'ورشة عمل'}
                    </span>
                    <span className="text-neutral-800">·</span>
                    <span className="text-[10px] text-neutral-700 font-mono">
                      {new Date(s.created_at).toLocaleDateString('ar-SA', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Action */}
                <button
                  onClick={() => handleOpen(s)}
                  className="flex-shrink-0 bg-neutral-100 hover:bg-white text-black font-bold px-4 py-2 rounded-sm transition-all hover:-translate-y-0.5 text-xs flex items-center gap-1.5"
                >
                  فتح لوحة التحكم
                  <span className="text-neutral-400">←</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
