import { type FC } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'

export const ConnectivityPill: FC = () => {
  const { health, checking, recheck } = useConnectivity()

  if (checking && !health) {
    return (
      <span className="conn-pill conn-pill--checking">
        <span className="conn-pill-dot" /> checking
      </span>
    )
  }

  const connected = health?.connected ?? false

  return (
    <span onClick={recheck} title="Click to retry" className={`conn-pill${connected ? ' conn-pill--ok' : ''}`}>
      <span className="conn-pill-dot" />
      {connected ? 'connected' : 'offline'}
      {!connected && <span className="conn-pill-hint">(click to retry)</span>}
    </span>
  )
}
