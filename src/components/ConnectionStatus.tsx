import { useEffect, useState } from 'react'
import type { ConnectionState } from '../types'

export function ConnectionStatus({ state }: { state: ConnectionState }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Delay showing to avoid flash on initial load
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
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        background: isOffline ? '#ef4444' : '#f59e0b',
        color: '#fff',
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        zIndex: 9997,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 2px 12px #0004',
      }}
    >
      <span style={{ animation: 'pulse 1.2s ease-in-out infinite' }}>●</span>
      {isOffline ? 'Offline — check your connection' : 'Reconnecting…'}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
