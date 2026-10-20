import { useState, useRef, useEffect, type FC } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useList } from '../../hooks/useResource'
import { deleteResource } from '../../api/client'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import type { CRStatus } from '../../types'

const KIND = 'builds'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getContract(item: CRStatus) {
  const spec = item.spec as Record<string, unknown> ?? {}
  return (spec.contract ?? spec) as Record<string, unknown>
}
function getStrategy(item: CRStatus) {
  const c = getContract(item)
  return String((c.strategy as Record<string,unknown>)?.name ?? c.strategy ?? '—')
}
function getImage(item: CRStatus) {
  const c = getContract(item)
  const img = String(c.image ?? '—')
  return img.split('/').pop() ?? img
}
function getSource(item: CRStatus) {
  const c = getContract(item)
  const src = (c.source ?? c) as Record<string,unknown>
  return String(src.url ?? '—').replace(/^(https?:\/\/|git@)/, '').replace('github.com/', '').replace('github.com:', '')
}
function fmtAge(ts?: string) {
  if (!ts) return '—'
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}
function flattenSpec(spec: unknown, prefix = ''): [string, string][] {
  if (!spec || typeof spec !== 'object') return []
  return Object.entries(spec as Record<string, unknown>).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) return flattenSpec(v, key)
    return [[key, Array.isArray(v) ? (v as unknown[]).join(', ') : String(v ?? '—')]] as [string,string][]
  })
}

// ── Step graph ────────────────────────────────────────────────────────────────
const STEPS = ['source', 'build', 'push']
function stepsFor(phase: string): string[] {
  const p = phase.toLowerCase()
  if (p === 'ready' || p === 'succeeded')
    return ['succeeded', 'succeeded', 'succeeded']
  if (p === 'failed')
    return ['succeeded', 'failed', 'pending']
  if (p === 'running')
    return ['succeeded', 'running', 'pending']
  return ['pending', 'pending', 'pending']
}

function StepGraph({ phase }: { phase: string }) {
  const sts = stepsFor(phase)
  const icons: Record<string, string> = {
    succeeded: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    running:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .9s linear infinite"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`,
    failed:    `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    pending:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  }
  return (
    <div className="sgraph">
      {STEPS.map((name, i) => (
        <div key={name} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && <div className={`sg-conn${sts[i-1] === 'succeeded' ? ' sg-conn--done' : ''}`} />}
          <div className={`sg-step sg-step--${sts[i]}`}>
            <span dangerouslySetInnerHTML={{ __html: icons[sts[i]] ?? icons.pending }} />
            {name}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Status dot ────────────────────────────────────────────────────────────────
function Dot({ phase }: { phase: string }) {
  const p = phase.toLowerCase()
  const cls = p === 'ready' || p === 'succeeded' ? 'dot-ready'
            : p === 'running'                     ? 'dot-running'
            : p === 'failed'                      ? 'dot-failed'
            : 'dot-pending'
  return <span className={`dot ${cls}`} />
}

// ── Main component ────────────────────────────────────────────────────────────
export const BuildList: FC = () => {
  const nav = useNavigate()
  const { data, loading, error, refetch } = useList(KIND, '', 4000)

  const [selected,     setSelected]    = useState<CRStatus | null>(null)
  const [activeTab,    setActiveTab]   = useState<'spec' | 'yaml' | 'conditions'>('spec')
  const [confirmOpen,  setConfirmOpen] = useState(false)
  const [, tick]                       = useState(0)
  const logRef = useRef<HTMLDivElement>(null)

  // tick for live age
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 10_000)
    return () => clearInterval(t)
  }, [])

  const items    = data?.items ?? []
  const running  = items.filter(b => b.phase.toLowerCase() === 'running').length
  const ready    = items.filter(b => ['ready','succeeded'].includes(b.phase.toLowerCase())).length
  const failed   = items.filter(b => b.phase.toLowerCase() === 'failed').length

  const handleSelect = (item: CRStatus) => {
    setSelected(item)
    setActiveTab('spec')
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      await deleteResource(KIND, selected.namespace, selected.name)
      setSelected(null)
      refetch()
    } catch (e) { console.error(e) }
    finally { setConfirmOpen(false) }
  }

  // YAML string for selected item
  const yamlStr = selected ? `apiVersion: environments.blanketops.dev/v1alpha1
kind: Build
metadata:
  name: ${selected.name}
  namespace: ${selected.namespace}
spec:
${JSON.stringify(selected.spec, null, 2).split('\n').map(l => '  ' + l).join('\n')}
status:
  phase: ${selected.phase}` : ''

  return (
    <div className="bl">

      {/* ── Page header ── */}
      <div className="bl-head">
        <nav className="breadcrumb">
          <Link to="/builds" className="bc-link">Builds</Link>
          <span className="bc-sep">/</span>
          <span>for-kaniko-app</span>
        </nav>
        <div className="bl-head-row">
          <div>
            <h1 className="bl-title">Builds</h1>
            <p className="bl-sub">namespace: blanketops</p>
          </div>
          <div className="bl-actions">
            <div className="bl-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search builds…" />
            </div>
            <Link to="/builds/new" className="btn btn-primary">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create Build
            </Link>
          </div>
        </div>
      </div>

      {/* ── Count bar ── */}
      <div className="bl-counts">
        <span className="bl-ct bl-ct--total">{items.length} total</span>
        {running > 0 && (
          <span className="bl-ct bl-ct--run">
            <span className="dot dot-running" /> {running} running
          </span>
        )}
        <span className="bl-ct bl-ct--ok">
          <span className="dot dot-ready" /> {ready} ready
        </span>
        {failed > 0 && (
          <span className="bl-ct bl-ct--fail">
            <span className="dot dot-failed" /> {failed} failed
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bl-table-wrap">
        <div className="bl-th">
          <div></div>
          <div>NAME / STRATEGY</div>
          <div>SOURCE</div>
          <div>PHASE</div>
          <div>IMAGE</div>
          <div>AGE</div>
          <div></div>
        </div>

        {/* Progress bar — always sweeping when loading OR running builds exist */}
        <div className="bl-prog">
          {(loading || running > 0) && <div className="bl-prog-fill" />}
        </div>

        {loading && items.length === 0 && (
          <div className="loading-state">
            <div className="spinner-lg" />
            loading builds…
          </div>
        )}

        {error && (
          <div className="loading-state list-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="empty-state">
            no builds yet — <Link to="/builds/new" className="list-create-link">create one</Link>
          </div>
        )}

        {items.map(item => {
          const phase = item.phase.toLowerCase()
          const isSel = selected?.name === item.name
          const age   = fmtAge(item.conditions[0]?.lastTransitionTime)
          return (
            <div
              key={item.name}
              className={`bl-tr${isSel ? ' bl-tr--sel' : ''}`}
              onClick={() => handleSelect(item)}
            >
              <div className="bl-td bl-td--center"><Dot phase={item.phase} /></div>
              <div>
                <div className="bl-name">{item.name}</div>
                <div className="bl-meta">
                  <span className="tag tag-blue">{getStrategy(item)}</span>
                </div>
              </div>
              <div className="bl-src">{getSource(item)}</div>
              <div><span className={`badge badge-${phase}`}>{phase}</span></div>
              <div className="bl-img">{getImage(item)}</div>
              <div className="bl-age">{age}</div>
              <div className="bl-td bl-td--center bl-kebab" onClick={e => e.stopPropagation()}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Placeholder ── */}
      {!selected && (
        <div className="bl-placeholder">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".25"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
          <p>select a build to view details</p>
        </div>
      )}

      {/* ── Detail panel ── */}
      {selected && (
        <div className="bl-det">
          {/* Det header */}
          <div className="bl-det-head">
            <div className="bl-det-meta">
              <span className={`badge badge-${selected.phase.toLowerCase()}`}>{selected.phase.toLowerCase()}</span>
              <span className="bl-det-name">{selected.name}</span>
              <span className="tag tag-blue">{getStrategy(selected)}</span>
              <span className="bl-det-info">{getSource(selected)}</span>
              <div className="bl-det-acts">
                <button
                  className="btn"
                  onClick={() => nav(`/builds/${selected.namespace}/${selected.name}/patch`)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  patch
                </button>
                <button className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  delete
                </button>
                <button className="btn" onClick={() => setSelected(null)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <StepGraph phase={selected.phase} />

            {/* Tabs */}
            <div className="bl-tabs">
              {(['spec','yaml','conditions'] as const).map(t => (
                <button
                  key={t}
                  className={`bl-tab${activeTab === t ? ' bl-tab--on' : ''}`}
                  onClick={() => setActiveTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="bl-det-body" ref={logRef}>
            {activeTab === 'spec' && (
              <div className="bl-fields">
                <div className="sec-title">METADATA</div>
                {[
                  ['name',       selected.name],
                  ['namespace',  selected.namespace],
                  ['generation', String(selected.generation ?? '—')],
                ].map(([k,v]) => (
                  <div key={k} className="field-row">
                    <div className="fk">{k}</div><div className="fv">{v}</div>
                  </div>
                ))}
                <div className="sec-title">SPEC</div>
                {flattenSpec(selected.spec).map(([k,v]) => (
                  <div key={k} className="field-row">
                    <div className="fk">{k}</div><div className="fv">{v}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'yaml' && (
              <div className="bl-yaml">
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
                  <button className="btn" onClick={() => navigator.clipboard.writeText(yamlStr)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    copy
                  </button>
                </div>
                <pre className="yaml-block">{yamlStr}</pre>
              </div>
            )}

            {activeTab === 'conditions' && (
              <div className="bl-conds">
                {selected.conditions.length === 0
                  ? <div className="empty-state">no conditions reported</div>
                  : selected.conditions.map((c, i) => {
                      const ok = c.status === 'True'
                      return (
                        <div key={i} className="cond-row">
                          <div className={`cond-dot ${ok ? 'dot-ready' : 'dot-failed'}`} />
                          <div>
                            <div className="cond-type">{c.type}</div>
                            <div className="cond-msg">{c.message}</div>
                          </div>
                        </div>
                      )
                    })
                }
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Build"
        message={`Delete "${selected?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}