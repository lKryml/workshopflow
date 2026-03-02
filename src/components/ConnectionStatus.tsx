import { useEffect, useState } from 'react'
import type { ConnectionState } from '../types'

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (state !== 'connected') {
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    } else {
      setShow(false)
    }
  }, [state])

  if (!show || state === 'connected') return null

  const isOffline = state === 'offline'

  return (
    <div
      className={`fixed bottom-4 left-4 z-[9997] flex items-center gap-2 px-3.5 py-2 rounded-lg text-white text-xs font-semibold ${
        isOffline ? 'bg-red-600' : 'bg-amber-600'
      } shadow-[0_2px_12px_rgba(0,0,0,0.4)]`}
    >
      <span className="dot-stuck w-2 h-2 rounded-full bg-white inline-block" />
      {isOffline ? 'غير متصل — تحقق من الاتصال' : 'جارٍ إعادة الاتصال...'}
    </div>
  )
}
