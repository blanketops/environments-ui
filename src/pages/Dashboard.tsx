import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { useList } from '../hooks/useResource'

// ── Health ────────────────────────────────────────────────────────────────────

interface HealthKind { kind: string; icon: string; label: string }

const HEALTH_KINDS: HealthKind[] = [
  { kind: 'environments',    icon: 'ti-box',           label: 'Environments' },
  { kind: 'builds',          icon: 'ti-package',       label: 'Builds' },
  { kind: 'packages',        icon: 'ti-box-multiple',  label: 'Packages' },
  { kind: 'serviceunits',    icon: 'ti-server',        label: 'ServiceUnits' },
  { kind: 'deployments',     icon: 'ti-rocket',        label: 'Deployments' },
  { kind: 'routes',          icon: 'ti-route',         label: 'Routes' },
  { kind: 'domains',         icon: 'ti-world',         label: 'Domains' },
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
      <div className="health-skel" />
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
          <div className="hnum hnum-total">
            <div className="hnum-val">{total}</div>
            <div className="hnum-lbl">total</div>
          </div>
        </div>
        {total > 0 && (
          <div className="health-bar">
            {ready   > 0 && <div className="hb-seg hb-ready"   style={{ width: `${ready/total*100}%` }} />}
            {running > 0 && <div className="hb-seg hb-running" style={{ width: `${running/total*100}%` }} />}
            {failed  > 0 && <div className="hb-seg hb-failed"  style={{ width: `${failed/total*100}%` }} />}
            {pending > 0 && <div className="hb-seg hb-pending" style={{ width: `${pending/total*100}%` }} />}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Status ────────────────────────────────────────────────────────────────────

type StageStatus = 'ready' | 'running' | 'pending' | 'failed'

interface Stage { label: string; icon: string; status: StageStatus }

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
        <div key={s.label} className="ps">
          <div className="ps-block">
            <div className={`ps-icon ${STATUS_CLS[s.status]}`}>
              <i className={`ti ${s.icon}`} />
              {s.status === 'running' && <div className="spinner" />}
            </div>
            <div className="ps-label">{s.label}</div>
          </div>
          {i < stages.length - 1 && (
            <div className="ps-arrow"><i className="ti ti-chevron-right" /></div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Pipelines (real data from API) ───────────────────────────────────────────

function pipelineStage(kind: string, phase: string): Stage {
  const p = phase.toLowerCase()
  switch (kind) {
    case 'builds':   return { label: 'Build',       icon: 'ti-package',   status: phaseStatus(p) }
    case 'deployments': return { label: 'Deployment', icon: 'ti-rocket',  status: phaseStatus(p) }
    case 'routes':   return { label: 'Route',       icon: 'ti-route',     status: phaseStatus(p) }
    case 'domains':  return { label: 'Domain',      icon: 'ti-world',     status: phaseStatus(p) }
    case 'packages': return { label: 'Package',     icon: 'ti-box-multiple', status: phaseStatus(p) }
    case 'serviceunits': return { label: 'ServiceUnit', icon: 'ti-server', status: phaseStatus(p) }
    case 'gitrepositories': return { label: 'GitRepository', icon: 'ti-git-branch', status: phaseStatus(p) }
    case 'githubevents': return { label: 'GitHubEvent', icon: 'ti-webhook', status: phaseStatus(p) }
    default:         return { label: kind,         icon: 'ti-box',       status: phaseStatus(p) }
  }
}

function phaseStatus(p: string): StageStatus {
  if (p === 'ready' || p === 'succeeded') return 'ready'
  if (p === 'running' || p === 'progressing') return 'running'
  if (p === 'failed') return 'failed'
  return 'pending'
}

// Pipelines fetches all data at the top level (no hooks inside loops),
// then filters CRs by environment label client-side.
function Pipelines() {
  const { data: envsData, loading: envLoading } = useList('environments')
  const { data: buildsData } = useList('builds')
  const { data: deploysData } = useList('deployments')
  const { data: routesData } = useList('routes')
  const { data: domainsData } = useList('domains')

  const envs = envsData?.items ?? []
  const allBuilds   = buildsData?.items ?? []
  const allDeploys  = deploysData?.items ?? []
  const allRoutes   = routesData?.items ?? []
  const allDomains  = domainsData?.items ?? []

  const envListLoading = envLoading || !envsData || !buildsData || !deploysData || !routesData || !domainsData

  if (envListLoading) return (
    <div className="pipeline-card">
      <div className="pipeline-hdr"><span className="env-name-label">Loading environments…</span></div>
    </div>
  )

  return (
    <>
      {envs.map(env => {
        const spec = (env.spec ?? {}) as Record<string, unknown>
        const envType = String(spec.environmentType ?? spec.envType ?? 'development')
        const envName = env.name

        const builds: Stage[] = (allBuilds)
          .filter(i => i.labels?.['environments.blanketops.dev/name'] === envName)
          .map(i => pipelineStage('builds', i.phase))
        const deployments: Stage[] = (allDeploys)
          .filter(i => i.labels?.['environments.blanketops.dev/name'] === envName)
          .map(i => pipelineStage('deployments', i.phase))
        const routes: Stage[] = (allRoutes)
          .filter(i => i.labels?.['environments.blanketops.dev/name'] === envName)
          .map(i => pipelineStage('routes', i.phase))
        const domains: Stage[] = (allDomains)
          .filter(i => i.labels?.['environments.blanketops.dev/name'] === envName)
          .map(i => pipelineStage('domains', i.phase))

        return (
          <div key={env.name} className="pipeline-card">
            <div className="pipeline-hdr">
              <i className="ti ti-box" style={{ color: 'var(--text2)' }} />
              <span className="env-name-label">{envName}</span>
              <span className="tag tag-blue">{envType}</span>
            </div>
            <div className="pipeline-track-label">BUILD CHAIN</div>
            <PipelineStages stages={builds} />
            <div className="pipeline-track-label" style={{ marginTop: 10 }}>DEPLOYMENTS</div>
            <PipelineStages stages={deployments} />
            <div className="pipeline-track-label" style={{ marginTop: 10 }}>NETWORKING</div>
            <PipelineStages stages={[...routes, ...domains]} />
          </div>
        )
      })}
    </>
  )
}

// ── Quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: 'ti-box',          label: 'New Environment',   sub: 'root CR',              bg: 'var(--blue-bg)',   c: 'var(--blue)',   to: '/environments' },
  { icon: 'ti-package',      label: 'New Build',         sub: 'kaniko · buildah',     bg: 'var(--green-bg)',  c: 'var(--green)',  to: '/builds' },
  { icon: 'ti-box-multiple', label: 'New Package',       sub: 'kustomize · state repo',bg: 'var(--bg3)',      c: 'var(--text2)', to: '/packages' },
  { icon: 'ti-server',       label: 'New ServiceUnit',   sub: 'static · build',       bg: 'var(--red-bg)',    c: 'var(--red)',    to: '/serviceunits' },
  { icon: 'ti-rocket',       label: 'New Deployment',    sub: 'k8s · helm',           bg: 'var(--amber-bg)',  c: 'var(--amber)',  to: '/deployments' },
  { icon: 'ti-route',        label: 'New Route',         sub: 'platform · custom',    bg: 'var(--blue-bg)',   c: 'var(--blue)',   to: '/routes' },
  { icon: 'ti-world',        label: 'New Domain',        sub: 'tls · dns01',          bg: 'var(--purple-bg)', c: 'var(--purple)', to: '/domains' },
  { icon: 'ti-git-branch',   label: 'New GitRepository', sub: 'flux · source',        bg: 'var(--green-bg)',  c: 'var(--green)',  to: '/gitrepositories' },
  { icon: 'ti-webhook',      label: 'New GitHubEvent',   sub: 'push · pr · webhook',  bg: 'var(--amber-bg)',  c: 'var(--amber)',  to: '/githubevents' },
]

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const Dashboard: FC = () => (
  <div className="dashboard">
    <div className="section-title">HEALTH</div>
    <div className="health-grid">
      {HEALTH_KINDS.map(h => <HealthCard key={h.kind} {...h} />)}
    </div>

    <div className="section-title" style={{ marginTop: 6 }}>ENVIRONMENT PIPELINES</div>
    <Pipelines />

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
