import { type FC } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'

export const ConnectivityStatus: FC = () => {
  const { health, checking, recheck } = useConnectivity()

  if (checking) {
    return (
      <div style={{
        background: '#f59e0b15',
        borderBottom: '1px solid #f59e0b30',
        padding: '10px 16px',
        fontSize: 12,
        fontFamily: 'var(--mono)',
        color: '#f59e0b',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
        Checking controller connection…
      </div>
    )
  }

  if (health?.connected) return null

  const reason = health?.reason ?? 'Cannot reach controller server'

  return (
    <div style={{
      background: '#dc262615',
      borderBottom: '1px solid #dc262630',
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, maxWidth: 1200 }}>
        <span style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: '#fff',
          flexShrink: 0,
          marginTop: 2,
        }}>!</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#fca5a5',
            marginBottom: 4,
            fontFamily: 'var(--sans)',
          }}>
            Controller unreachable
          </div>
          <div style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: '#f87171',
            fontFamily: 'var(--mono)',
            marginBottom: 8,
          }}>
            {reason}
          </div>
          <div style={{
            fontSize: 11,
            lineHeight: 1.7,
            color: '#9ca3af',
            fontFamily: 'var(--sans)',
          }}>
            This could mean:
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li>The controller is not running — check <code style={{ color: '#d1d5db' }}>make run</code> in the controller directory</li>
              <li>Kubernetes is unreachable — verify your kubeconfig or cluster connection</li>
              <li>The API server (port 8082) is not running — check <code style={{ color: '#d1d5db' }}>go run .</code> in the server directory</li>
              <li>A firewall or proxy is blocking the connection between the UI and the server</li>
            </ul>
          </div>
          <button
            onClick={recheck}
            style={{
              marginTop: 10,
              padding: '6px 14px',
              borderRadius: 4,
              border: '1px solid #dc262650',
              background: 'transparent',
              color: '#fca5a5',
              fontSize: 11,
              fontFamily: 'var(--mono)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dc262620' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            ↻ retry connection
          </button>
        </div>
      </div>
    </div>
  )
}