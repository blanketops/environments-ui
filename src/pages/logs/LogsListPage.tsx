import { useState, useEffect, type FC } from 'react'
import { Link } from 'react-router-dom'

// LogsListPage lists available pods in a namespace and links to their log viewer.
// Entry point at /logs (defaults to blanketops-environments namespace).
export const LogsListPage: FC = () => {
  const [namespace, setNamespace] = useState('blanketops-environments')
  const [pods, setPods] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPods = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/pods?namespace=${encodeURIComponent(namespace)}`, {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body || res.statusText}`)
      }
      const data: string[] = await res.json()
      setPods(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPods()
  }, [namespace])

  return (
    <div className="logs-page">
      <div className="log-toolbar">
        <Link to="/" className="btn">
          <i className="ti ti-arrow-left" /> back to home
        </Link>
        <span className="toolbar-divider">·</span>
        <span className="toolbar-label">controller logs</span>
        <label className="toolbar-label">namespace</label>
        <input
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="input input-sm"
          placeholder="blanketops-environments"
        />
        <button className="btn btn-primary" onClick={fetchPods} disabled={loading}>
          {loading ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-refresh" />}
        </button>
      </div>

      <div className="log-viewport">
        {error && (
          <div className="empty-state" style={{ color: 'var(--red)' }}>
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}
        {!error && loading && (
          <div className="empty-state">
            <div className="spinner-lg" /> loading pods…
          </div>
        )}
        {!error && !loading && pods.length === 0 && (
          <div className="empty-state">
            <i className="ti ti-shield-off" />
            <p>No pods found in namespace <code>{namespace}</code>.</p>
          </div>
        )}
        {!error && !loading && pods.length > 0 && (
          <div className="card">
            <div className="card-hdr">
              <span className="card-title">pods in {namespace}</span>
              <span className="total-badge">{pods.length}</span>
            </div>
            <ul className="pod-list">
              {pods.map((pod) => (
                <li key={pod} className="pod-list-item">
                  <Link
                    to={`/logs/${namespace}/${pod}`}
                    className="pod-list-link"
                  >
                    <span className="pod-name">{pod}</span>
                    <span className="pod-arrow">
                      <i className="ti ti-arrow-right" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="log-hint">
        <i className="ti ti-info-circle" /> Pick a pod to stream its live logs. Also available via stern:
        <code>stern &lt;pod&gt; -n {namespace}</code>
      </div>
    </div>
  )
}
