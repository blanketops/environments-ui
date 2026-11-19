import { useState, useEffect, useRef, type FC } from 'react'
import { Link, useParams } from 'react-router-dom'

// LogsPage streams pod container logs from the environments-server
// /api/v1/pods/{namespace}/{pod}/logs endpoint and polls for updates.
// Container defaults to 'manager' (the environments-controller container).
export const LogsPage: FC = () => {
  const { namespace, pod } = useParams<{ namespace?: string; pod?: string }>()

  const [logs, setLogs] = useState('')
  const [container, setContainer] = useState('manager')
  const [tailLines, setTailLines] = useState(200)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    if (autoScroll && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  const fetchLogs = async () => {
    if (!namespace || !pod) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/v1/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/logs?container=${encodeURIComponent(container)}&tailLines=${tailLines}`,
        { headers: { Accept: 'text/plain' } }
      )
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body || res.statusText}`)
      }
      const text = await res.text()
      setLogs(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // Poll every 3 seconds for live updates
    pollRef.current = setInterval(fetchLogs, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [namespace, pod, container, tailLines])

  useEffect(scrollToBottom, [logs, autoScroll])

  if (!namespace || !pod) {
    return (
      <div className="logs-page">
        <div className="card">
          <div className="card-hdr">
            <span className="card-title">Controller Logs</span>
          </div>
          <div className="empty-state">
            <p>No pod selected. Open a resource detail drawer and open its logs, or navigate directly to <code>/logs/{namespace}/{pod}</code>.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="logs-page">
      <div className="log-toolbar">
        <Link to="/environments" className="btn">
          <i className="ti ti-arrow-left" /> back to environments
        </Link>
        <span className="toolbar-divider">·</span>
        <span className="toolbar-label">{namespace}/{pod}</span>
        <select
          value={container}
          onChange={(e) => { setContainer(e.target.value); setLogs(''); fetchLogs() }}
          className="input input-sm"
        >
          <option value="manager">manager</option>
          <option value="kube-rbac-proxy">kube-rbac-proxy</option>
        </select>
        <label className="toolbar-label">tail</label>
        <select
          value={String(tailLines)}
          onChange={(e) => { setTailLines(parseInt(e.target.value, 10)); setLogs(''); fetchLogs() }}
          className="input input-sm"
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="500">500</option>
          <option value="1000">1000</option>
        </select>
        <button
          className="btn btn-primary"
          onClick={() => { setLogs(''); fetchLogs() }}
          disabled={loading}
        >
          {loading ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-refresh" />}
        </button>
        <label className="toolbar-checkbox">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          auto-scroll
        </label>
      </div>

      <div className="log-viewport">
        {error && (
          <div className="empty-state" style={{ color: 'var(--red)' }}>
            <i className="ti ti-alert-circle" /> {error}
          </div>
        )}
        <pre className="log-content">{logs}</pre>
        <div ref={endRef} />
      </div>

      <div className="log-hint">
        <i className="ti ti-info-circle" /> Live polls every 3s. Also available via stern:
        <code>stern {pod} -n {namespace}</code>
      </div>
    </div>
  )
}
