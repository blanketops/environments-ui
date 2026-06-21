import { type FC } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'

export const ConnectivityPill: FC = () => {
  const { health, checking, recheck } = useConnectivity()

  if (checking && !health) {
    return (
      <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#f59e0b' }}>
        ● checking
      </span>
    )
  }

  const connected = health?.connected ?? false

  return (
    <span
      onClick={recheck}
      title="Click to retry"
      style={{
        fontSize: 11,
        fontFamily: 'var(--mono)',
        color: connected ? '#22c55e' : '#ef4444',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: connected ? '#22c55e' : '#ef4444',
      }} />
      {connected ? 'connected' : 'offline'}
      {!connected && <span style={{ color: '#9ca3af', marginLeft: 4 }}>(click to retry)</span>}
    </span>
  )
}