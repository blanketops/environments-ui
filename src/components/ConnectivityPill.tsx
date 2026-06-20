import { type FC } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'

export const ConnectivityPill: FC = () => {
  const { health, checking } = useConnectivity()

  if (checking) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
        checking
      </span>
    )
  }

  if (!health || !health.connected) {
    return (
      <span
        title={health?.reason ?? 'Cannot reach controller'}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--mono)', color: '#ef4444', cursor: 'help' }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
        offline
      </span>
    )
  }

  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontFamily: 'var(--mono)', color: '#22c55e' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
      connected
    </span>
  )
}