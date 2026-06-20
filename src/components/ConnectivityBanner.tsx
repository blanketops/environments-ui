import { type FC } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'

export const ConnectivityBanner: FC = () => {
  const { health } = useConnectivity()

  if (!health || health.connected) return null

  return (
    <div
      style={{
        background: '#dc2626',
        color: '#fff',
        padding: '8px 16px',
        fontSize: 12,
        fontFamily: 'var(--mono, monospace)',
        fontWeight: 500,
        textAlign: 'center',
        letterSpacing: '0.02em',
      }}
    >
      ⚠️ Controller unreachable: {health.reason ?? 'Cannot connect to cluster'}
    </div>
  )
}