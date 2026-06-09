import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { useList } from '../hooks/useResource'
import type { Kind } from '../types'

// ── Health ────────────────────────────────────────────────────────────────────

interface HealthKind { kind: Kind; icon: string; label: string }

const HEALTH_KINDS: HealthKind[] = [
  { kind: 'environments',    icon: 'ti-box',           label: 'environments' },
  { kind: 'builds',          icon: 'ti-package',       label: 'builds' },
  { kind: 'buildtriggers',   icon: 'ti-player-play',   label: 'build triggers' },
  { kind: 'packages',        icon: 'ti-box-multiple',  label: 'packages' },
  { kind: 'serviceunits',    icon: 'ti-server',        label: 'service units' },
  { kind: 'deployments',     icon: 'ti-rocket',        label: 'deployments' },
  { kind: 'routes',          icon: 'ti-route',         label: 'routes' },
  { kind: 'domains',         icon: 'ti-world',         label: 'domains' },
  { kind: 'supplychains',    icon: 'ti-shield-check',  label: 'supply chains' },
  { kind: 'githubpayloads',  icon: 'ti-file-code',     label: 'github payloads' },
]

function HealthCard({ kind, icon, label }: HealthKind) {
  const { data, loading } = useList(kind)
  const items = data?.items ?? []
  const ready   = items.filter(i => i.phase === 'Ready').length
  const running = items.filter(i => i.phase === 'Running').length
  const failed  = items.filter(i => i.phase === 'Failed').length
  const pending = items.filter(i => i.phase === 'Pending').length
  const total   = items.length

  if (loading) return (
    <div className="health-card">
      <div className="health-label"><i className={`ti ${icon}`} />{label}</div>
      <div style={{ height: 28, background: 'var(--bg3)', borderRadius: 4, width: 60 }} />
    </div>
  )

  return (
    <Link to={`/${kind}`} style={{ textDecoration: 'none' }}>
      <div className="health-card">
        <div className="health-label"><i className={`ti ${icon}`} />{label}</div>
        <div className="health-nums">
          <div className="hnum hnum-ready">  <div className="hnum-val">{ready}</div>  <div className="hnum-lbl">ready</div></div>
          {running > 0 && <div className="hnum hnum-running"><div className="hnum-val">{running}</div><div className="hnum-lbl">running</div></div>}
          {failed  > 0 && <div className="hnum hnum-failed"> <div className="hnum-val">{failed}</div> <div className="hnum-lbl">failed</div></div>}
          {pending > 0 && <div className="hnum hnum-pending"><div className="hnum-val">{pending}</div><div className="hnum-lbl">pending</div></div>}
          <div className="hnum hnum-total" style={{ marginLeft: 'auto' }}>
            <div className="hnum-val">{total}</div>
            <div className="hnum-lbl">total</div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// ── Pipelines ─────────────────────────────────────────────────────────────────

type StageStatus = 'ready' | 'running' | 'pending' | 'failed'

interface Stage { l: string; i: string; s: StageStatus }
interface PipelineEnv { name: string; type: string; store: string; build: Stage[]; net: Stage[] }

const PIPELINES: PipelineEnv[] = [
  {
    name: 'environment-sample', type: 'dev', store: 'aws',
    build: [
      { l: 'GitRepository', i: 'ti-git-branch',  s: 'ready' },
      { l: 'GitHubEvent',   i: 'ti-webhook',      s: 'ready' },
      { l: 'BuildTrigger',  i: 'ti-player-play',  s: 'ready' },
      { l: 'Build',         i: 'ti-package',       s: 'running' },
      { l: 'SupplyChain',   i: 'ti-shield-check', s: 'pending' },
      { l: 'Package',       i: 'ti-box-multiple',  s: 'pending' },
      { l: 'ServiceUnit',   i: 'ti-server',        s: 'pending' },
      { l: 'Deployment',    i: 'ti-rocket',        s: 'pending' },
    ],
    net: [
      { l: 'Route',  i: 'ti-route', s: 'ready' },
      { l: 'Domain', i: 'ti-world', s: 'running' },
    ],
  },
  {
    name: 'dev-sandbox-001', type: 'dev', store: 'gcp',
    build: [
      { l: 'GitRepository', i: 'ti-git-branch',  s: 'ready' },
      { l: 'GitHubEvent',   i: 'ti-webhook',      s: 'ready' },
      { l: 'BuildTrigger',  i: 'ti-player-play',  s: 'ready' },
      { l: 'Build',         i: 'ti-package',       s: 'ready' },
      { l: 'SupplyChain',   i: 'ti-shield-check', s: 'ready' },
      { l: 'Package',       i: 'ti-box-multiple',  s: 'ready' },
      { l: 'ServiceUnit',   i: 'ti-server',        s: 'running' },
      { l: 'Deployment',    i: 'ti-rocket',        s: 'pending' },
    ],
    net: [
      { l: 'Route',  i: 'ti-route', s: 'pending' },
      { l: 'Domain', i: 'ti-world', s: 'pending' },
    ],
  },
]

const STATUS_CLS: Record<StageStatus, string> = {
  ready:   'ps-ready',
  running: 'ps-running',
  failed:  'ps-failed',
  pending: 'ps-pending',
}

function PipelineStages({ stages }: { stages: Stage[] }) {
  return (
    <div className="pipeline-stages">
      {stages.map((s, i) => (
        <div key={s.l} className="ps">
          <div className="ps-block">
            <div className={`ps-icon ${STATUS_CLS[s.s]}`}>
              <i className={`ti ${s.i}`} />
              {s.s === 'running' && <div className="spinner" />}
            </div>
            <div className="ps-label">{s.l}</div>
          </div>
          {i < stages.length - 1 && (
            <div className="ps-arrow"><i className="ti ti-chevron-right" /></div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: 'ti-box',         label: 'New Environment', sub: 'root CR',              bg: 'var(--blue-bg)',   c: 'var(--blue)',   to: '/environments' },
  { icon: 'ti-package',     label: 'New Build',       sub: 'kaniko · buildah',     bg: 'var(--green-bg)',  c: 'var(--green)',  to: '/builds' },
  { icon: 'ti-player-play', label: 'New Trigger',     sub: 'push · pull_request',  bg: 'var(--amber-bg)',  c: 'var(--amber)',  to: '/buildtriggers' },
  { icon: 'ti-box-multiple',label: 'New Package',     sub: 'kustomize · state repo',bg: 'var(--bg3)',      c: 'var(--text2)', to: '/packages' },
  { icon: 'ti-server',      label: 'New ServiceUnit', sub: 'static · build',       bg: 'var(--red-bg)',    c: 'var(--red)',    to: '/serviceunits' },
  { icon: 'ti-route',       label: 'New Route',       sub: 'platform · custom',    bg: 'var(--blue-bg)',   c: 'var(--blue)',   to: '/routes' },
]

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const Dashboard: FC = () => (
  <div>
    <div className="section-title">HEALTH</div>
    <div className="health-grid">
      {HEALTH_KINDS.map(h => <HealthCard key={h.kind} {...h} />)}
    </div>

    <div className="section-title" style={{ marginTop: 6 }}>ENVIRONMENT PIPELINES</div>
    {PIPELINES.map(env => (
      <div key={env.name} className="pipeline-card">
        <div className="pipeline-hdr">
          <i className="ti ti-box" style={{ color: 'var(--text2)' }} />
          <span className="env-name-label">{env.name}</span>
          <span className="tag tag-blue">{env.type}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>store:{env.store}</span>
        </div>
        <div className="pipeline-track-label">BUILD CHAIN</div>
        <PipelineStages stages={env.build} />
        <div className="pipeline-track-label" style={{ marginTop: 10 }}>NETWORKING</div>
        <PipelineStages stages={env.net} />
      </div>
    ))}

    <div className="section-title" style={{ marginTop: 6 }}>QUICK ACTIONS</div>
    <div className="qa-grid">
      {QUICK_ACTIONS.map(qa => (
        <Link key={qa.label} to={qa.to} style={{ textDecoration: 'none' }}>
          <div className="qa-card">
            <div className="qa-icon" style={{ background: qa.bg, color: qa.c }}>
              <i className={`ti ${qa.icon}`} />
            </div>
            <div>
              <div className="qa-label">{qa.label}</div>
              <div className="qa-sub">{qa.sub}</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </div>
)
