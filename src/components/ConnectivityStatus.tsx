import { type FC } from 'react'
import { useConnectivity } from '../hooks/useConnectivity'

export const ConnectivityStatus: FC = () => {
  const { health, checking, recheck } = useConnectivity()

  // Only the first check shows the banner; later polls keep the last result
  // on screen instead of flashing "checking" every few seconds.
  if (checking && !health) {
    return (
      <div className="conn-banner conn-banner--checking">
        <span className="conn-banner-dot" />
        Checking controller connection…
      </div>
    )
  }

  if (health?.connected) return null

  const reason = health?.reason ?? 'Cannot reach controller server'

  return (
    <div className="conn-banner conn-banner--down">
      <span className="conn-banner-icon">!</span>
      <div className="conn-banner-body">
        <div className="conn-banner-title">Controller unreachable</div>
        <div className="conn-banner-reason">{reason}</div>
        <div className="conn-banner-help">
          This could mean:
          <ul>
            <li>The controller is not running — check <code>make run</code> in the controller directory</li>
            <li>Kubernetes is unreachable — verify your kubeconfig or cluster connection</li>
            <li>The API server (port 8082) is not running — check <code>go run .</code> in the server directory</li>
            <li>A firewall or proxy is blocking the connection between the UI and the server</li>
          </ul>
        </div>
        <button type="button" onClick={recheck} className="btn btn-danger conn-banner-retry">
          <i className="ti ti-refresh" /> retry connection
        </button>
      </div>
    </div>
  )
}
