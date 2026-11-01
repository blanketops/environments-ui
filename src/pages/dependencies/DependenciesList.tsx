import { type FC } from 'react'
import { useList } from '../../hooks/useResource'
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

type DependencyKind = typeof DEPENDENCY_KINDS[number]

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
  const { data, loading } = useList('dependencies')

  return (
    <div className="bl">
      <header className="bl-head">
        <h1 className="bl-title">Dependencies</h1>
        <p className="bl-sub">Platform dependencies — managed via bops-env</p>
        <div className="bl-actions">
          <a href="/dependencies/new" className="btn btn-primary">
            <i className="ti ti-plus" /> new dependency
          </a>
        </div>
      </header>

      <div className="bl-counts">
        <span className="bl-ct bl-ct--total">{data?.total ?? 0} total</span>
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
          {loading ? (
            <div className="loading-state"><div className="spinner-lg" />loading…</div>
          ) : data?.items.length === 0 ? (
            <tr><td colSpan={6} className="bl-placeholder">no dependencies yet</td></tr>
          ) : (
            data?.items
              .filter(dep => DEPENDENCY_KINDS.includes(dep.kind as DependencyKind))
              .map(dep => <DepRow key={dep.name} dep={dep} />)
          )}
        </tbody>
      </div>

      <div className="bl-placeholder">
        <i className="ti ti-box" style={{fontSize: 32, color: 'var(--text3)'}} />
        <p>Dependencies list — managed via bops-env</p>
      </div>
    </div>
  )
}