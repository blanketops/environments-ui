import { type FC } from 'react'
import { Link } from 'react-router-dom'
import { useList } from '../hooks/useResource'
import type { CRStatus } from '../types'

// ── Resource type overview ─────────────────────────────────────────────────

const RESOURCE_GROUPS = [
  {
    title: 'BUILD PIPELINE',
    items: [
      { icon: 'ti-box',          kind: 'Environment',  to: '/environments/new',   desc: 'Root CR — namespace, secret store, env type' },
      { icon: 'ti-package',      kind: 'Build',         to: '/builds/new',         desc: 'Shipwright — kaniko, buildpacks, buildah' },
      { icon: 'ti-box-multiple', kind: 'Package',       to: '/packages/new',       desc: 'kapp-diff + kustomize state repo reconciliation' },
      { icon: 'ti-server',       kind: 'ServiceUnit',   to: '/serviceunits/new',   desc: 'Runtime unit — image, port, env, size' },
      { icon: 'ti-rocket',       kind: 'Deployment',    to: '/deployments/new',    desc: 'FluxCD overlay — rolling, blue-green, canary' },
    ],
  },
  {
    title: 'NETWORKING',
    items: [
      { icon: 'ti-route', kind: 'Route',  to: '/routes/new',  desc: 'Ingress — Kubernetes container or Knative serving' },
      { icon: 'ti-world', kind: 'Domain', to: '/domains/new', desc: 'TLS cert — wildcard via cloudflared or HTTP01 ACME' },
    ],
  },
  {
    title: 'SOURCES & EVENTS',
    items: [
      { icon: 'ti-git-branch', kind: 'GitRepository', to: '/gitrepositories/new', desc: 'Source repo — webhook registration via Crossplane' },
      { icon: 'ti-webhook',    kind: 'GitHubEvent',   to: '/githubevents/new',    desc: 'Webhook payload — push, pull_request, release' },
    ],
  },
  {
    title: 'SUPPLY CHAIN',
    items: [
      { icon: 'ti-shield-check',   kind: 'SupplyChain',   to: '/supplychains/new',   desc: 'Tekton pipeline — sign, attest, SonarQube, Grafeas' },
      { icon: 'ti-plug-connected', kind: 'GitHubWebhook', to: '/githubwebhooks/new', desc: 'GitHub webhook registration for supply chain' },
    ],
  },
  {
    title: 'PLATFORM DEPENDENCIES',
    items: [
      { icon: 'ti-box',           kind: 'carvel',          to: '/dependencies/new',  desc: 'Carvel Kapp Controller — packaging and lifecycle management' },
      { icon: 'ti-webhook',       kind: 'argoevents',      to: '/dependencies/new',  desc: 'Argo Events — event-driven pipelines' },
      { icon: 'ti-package',       kind: 'tekton-pipelines', to: '/dependencies/new', desc: 'Tekton Pipelines — CI/CD execution engine' },
      { icon: 'ti-layout-dashboard', kind: 'tekton-dashboard', to: '/dependencies/new', desc: 'Tekton Dashboard — pipeline UI' },
      { icon: 'ti-package',       kind: 'shipwright',      to: '/dependencies/new', desc: 'Shipwright Build — Kubernetes-native image builds' },
      { icon: 'ti-server',        kind: 'crossplane',      to: '/dependencies/new', desc: 'Crossplane — infrastructure orchestration' },
      { icon: 'ti-shield',        kind: 'externalsecrets', to: '/dependencies/new', desc: 'External Secrets Operator — secure secret integration' },
      { icon: 'ti-shield-check',  kind: 'buildstrategies', to: '/dependencies/new', desc: 'Shipwright build strategies (buildpacks, kaniko, buildah)' },
      { icon: 'ti-git-branch',    kind: 'flux',            to: '/dependencies/new', desc: 'Flux UI + config' },
      { icon: 'ti-shield',        kind: 'knative',         to: '/dependencies/new', desc: 'Knative Serving — serverless workload runtime' },
      { icon: 'ti-route',         kind: 'kourier',         to: '/dependencies/new', desc: 'Kourier — Knative ingress/networking layer' },
    ],
  },
]

// ── Environment summary ────────────────────────────────────────────────────

function EnvRow({ env }: { env: CRStatus }) {
  const phase   = env.phase.toLowerCase()
  const spec    = (env.spec ?? {}) as Record<string, unknown>
  const contract = (spec.contract ?? {}) as Record<string, unknown>
  const envType  = String(spec.envType ?? contract.envType ?? '—')
  return (
    <Link to="/environments" className="env-summary-row">
      <span className={`dot dot-${phase}`} />
      <span className="env-summary-name">{env.name}</span>
      <span className="tag tag-blue">{envType}</span>
      <span className="env-summary-ns">{env.namespace}</span>
      <span className={`badge badge-${phase}`}>{phase}</span>
      <i className="ti ti-chevron-right row-chevron" />
    </Link>
  )
}

function EnvironmentSection() {
  const { data, loading } = useList('environments')
  const envs = data?.items ?? []

  return (
    <div className="home-env-section">
      <div className="home-section-hdr">
        <span className="section-title">ENVIRONMENTS</span>
        <Link to="/environments/new" className="btn btn-primary">
          <i className="ti ti-plus" />new environment
        </Link>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner-lg" />loading…</div>
      ) : envs.length === 0 ? (
        <div className="home-empty">
          <i className="ti ti-box home-empty-icon" />
          <div className="home-empty-title">no environments yet</div>
          <div className="home-empty-sub">
            An Environment CR is the root of your deployment graph.
            Create one to start tracking builds, packages, and deployments.
          </div>
          <Link to="/environments/new" className="btn btn-primary">
            <i className="ti ti-plus" />create your first environment
          </Link>
        </div>
      ) : (
        <div className="env-summary-list">
          {envs.map(env => <EnvRow key={env.name} env={env} />)}
          <Link to="/environments" className="env-summary-more">
            view all environments <i className="ti ti-arrow-right" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Home ───────────────────────────────────────────────────────────────────

export const Home: FC = () => (
  <div className="home-page">

    <div className="home-hero">
      <div className="home-wordmark">
        blanket<span className="home-ops">ops</span>
        <span className="home-product">environments</span>
      </div>
      <p className="home-tagline">
        platform-level multi-tenant environment management for cloud-native applications
      </p>
      <div className="home-meta">
        <span className="tag tag-blue">operator v0.1.0</span>
        <span className="tag">cluster: kind-dev</span>
        <span className="tag">ns: blanketops-system</span>
      </div>
    </div>

    <EnvironmentSection />

    {RESOURCE_GROUPS.map(group => (
      <div key={group.title} className="home-resource-group">
        <span className="section-title">{group.title}</span>
        <div className="rtc-grid">
          {group.items.map(r => (
            <Link key={r.kind} to={r.to} className="rtc">
              <i className={`ti ${r.icon} rtc-icon`} />
              <div className="rtc-kind">{r.kind}</div>
              <div className="rtc-desc">{r.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    ))}

  </div>
)
