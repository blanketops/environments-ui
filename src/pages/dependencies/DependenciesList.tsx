import { useState, useEffect, type FC } from 'react'
import { list } from '../../api/client'
import type { CRStatus } from '../../types'

const DEPENDENCY_KINDS = [
  'carvel',
  'argoevents',
  'tekton-pipelines',
  'tekton-dashboard',
  'shipwright',
  'crossplane',
  'externalsecrets',
  'buildstrategies',
  'flux',
  'knative',
  'kourier',
] as const

function DepRow({ dep }: { dep: CRStatus }) {
  const phase = dep.phase.toLowerCase()
  return (
    <tr className="bl-tr">
      <td className="bl-td--center">
        <span className={`dot dot-${phase}`} />
      </td>
      <td className="bl-name">{dep.name}</td>
      <td>
        <span className="bl-src">{dep.namespace}</span>
      </td>
      <td className="bl-img">{dep.kind}</td>
      <td className="bl-age">{dep.phase}</td>
      <td>
        <i className="ti ti-chevron-right bl-kebab" />
      </td>
    </tr>
  )
}

export const DependenciesList: FC = () => {
  const [data, setData] = useState<CRStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all(
      DEPENDENCY_KINDS.map(kind =>
        list(kind).then((res: { items?: CRStatus[] }) => res.items ?? [])
      )
    )
      .then(lists => {
        const merged = lists.flat().sort((a, b) => a.name.localeCompare(b.name))
        setData(merged)
      })
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bl">
        <header className="bl-head">
          <h1 className="bl-title">Dependencies</h1>
          <p className="bl-sub">Platform dependencies — managed via bops-env</p>
        </header>
        <div className="loading-state"><div className="spinner-lg" />loading…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bl">
        <header className="bl-head">
          <h1 className="bl-title">Dependencies</h1>
          <p className="bl-sub">Platform dependencies — managed via bops-env</p>
        </header>
        <div className="bl-placeholder">
          <i className="ti ti-alert-triangle" style={{ fontSize: 32, color: 'var(--text3)' }} />
          <p>Failed to load dependencies: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bl">
      <header className="bl-head">
        <h1 className="bl-title">Dependencies</h1>
        <p className="bl-sub">Platform dependencies — managed via bops-env</p>
      </header>

      <div className="bl-counts">
        <span className="bl-ct bl-ct--total">{data.length} total</span>
      </div>

      <div className="bl-table-wrap">
        <div className="bl-th">
          <th className="bl-td--center"></th>
          <th>NAME</th>
          <th>NAMESPACE</th>
          <th>KIND</th>
          <th>PHASE</th>
          <th></th>
        </div>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={6} className="bl-placeholder">no dependencies yet</td></tr>
          ) : (
            data.map(dep => <DepRow key={dep.name} dep={dep} />)
          )}
        </tbody>
      </div>

      <div className="bl-placeholder">
        <i className="ti ti-box" style={{ fontSize: 32, color: 'var(--text3)' }} />
        <p>Dependencies list — managed via bops-env</p>
      </div>
    </div>
  )
}
