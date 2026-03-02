import { useEffect } from 'react'

export function BroadcastBanner({
  message,
  onDismiss,
}: {
  message: string | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="broadcast-in fixed top-5 left-1/2 -translate-x-1/2 z-[10000] w-[calc(100vw-48px)] max-w-[520px] bg-orange-600/90 backdrop-blur-xl border border-orange-500/50 text-white px-4 py-3.5 rounded-xl shadow-[0_8px_32px_rgba(234,88,12,0.4)] flex items-center gap-3">
      <span className="text-lg flex-shrink-0">📢</span>
      <span className="flex-1 text-sm font-semibold leading-snug" dir="rtl">{message}</span>
      <button
        onClick={onDismiss}
        className="w-7 h-7 bg-white/10 hover:bg-white/20 border-0 rounded-md text-white cursor-pointer text-base flex items-center justify-center flex-shrink-0 transition-colors"
      >
        ×
      </button>
    </div>
  )
}
