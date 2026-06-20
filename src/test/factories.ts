/**
 * test/factories.ts
 *
 * Typed fixture builders for all BlanketOps Environments CR shapes.
 * Override any field with a partial — everything else defaults.
 */

import type { CRStatus, Condition, CREvent, ListResponse } from '../api/client'

// ── Condition ─────────────────────────────────────────────────────────────────

export function makeCondition(overrides: Partial<Condition> = {}): Condition {
  return {
    type: 'Ready',
    status: 'True',
    reason: 'ReconcileSuccess',
    message: 'Reconciled successfully',
    lastTransitionTime: new Date().toISOString(),
    ...overrides,
  }
}

export function makeFailedCondition(overrides: Partial<Condition> = {}): Condition {
  return makeCondition({
    status: 'False',
    reason: 'ReconcileError',
    message: 'Reconciliation failed: upstream error',
    ...overrides,
  })
}

// ── CREvent ───────────────────────────────────────────────────────────────────

export function makeEvent(overrides: Partial<CREvent> = {}): CREvent {
  return {
    type: 'Normal',
    reason: 'ReconcileSuccess',
    message: 'Reconciled successfully',
    count: 1,
    firstTime: new Date(Date.now() - 3600_000).toISOString(),
    lastTime: new Date().toISOString(),
    ...overrides,
  }
}

export function makeWarningEvent(overrides: Partial<CREvent> = {}): CREvent {
  return makeEvent({
    type: 'Warning',
    reason: 'ReconcileError',
    message: 'upstream dependency not ready',
    ...overrides,
  })
}

// ── CRStatus base ─────────────────────────────────────────────────────────────

function baseCR(kind: string, overrides: Partial<CRStatus> = {}): CRStatus {
  return {
    name: `${kind}-sample`,
    namespace: 'blanketops-system',
    kind,
    phase: 'Ready',
    generation: 1,
    conditions: [makeCondition()],
    events: [makeEvent()],
    labels: { 'blanketops.dev/managed': 'true' },
    ...overrides,
  }
}

// ── Per-kind factories ────────────────────────────────────────────────────────

export function makeEnvironment(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('environments', {
    name: 'env-sample',
    spec: {
      contract: { secretStore: { provider: 'aws' } },
      environmentClass: 'standard',
    },
    ...overrides,
  })
}

export function makeBuild(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('builds', {
    name: 'build-sample',
    spec: {
      strategy: 'kaniko',
      contextPath: '.',
      image: 'registry.blanketops.dev/app:latest',
    },
    ...overrides,
  })
}


export function makePackage(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('packages', {
    name: 'pkg-sample',
    spec: { strategy: 'kustomize', stateRepo: 'git@github.com:blanketops/state.git' },
    ...overrides,
  })
}

export function makeServiceUnit(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('serviceunits', {
    name: 'su-sample',
    spec: { type: 'static', imageRef: 'registry.blanketops.dev/app:v1.0.0' },
    ...overrides,
  })
}

export function makeDeployment(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('deployments', {
    name: 'deploy-sample',
    spec: {
      serviceUnits: ['su-sample'],
      strategy: 'Rolling',
      manifestsRepo: 'git@github.com:blanketops/manifests.git',
    },
    ...overrides,
  })
}

export function makeGitRepository(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('gitrepositories', {
    name: 'repo-sample',
    spec: { url: 'git@github.com:blanketops/app.git', branch: 'main' },
    ...overrides,
  })
}

export function makeGitHubEvent(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('githubevents', {
    name: 'ghe-sample',
    spec: { events: ['push', 'pull_request'], repositoryRef: 'repo-sample' },
    ...overrides,
  })
}

export function makeRoute(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('routes', {
    name: 'route-sample',
    spec: { host: 'app.dev.blanketops.dev', path: '/', tlsEnabled: true },
    ...overrides,
  })
}

export function makeDomain(overrides: Partial<CRStatus> = {}): CRStatus {
  return baseCR('domains', {
    name: 'domain-sample',
    spec: { host: 'blanketops.dev', tlsStrategy: 'DNS01' },
    ...overrides,
  })
}

// ── ListResponse builder ──────────────────────────────────────────────────────

export function makeListResponse(items: CRStatus[] = []): ListResponse {
  return {
    items,
    resourceVersion: 'test-rv-1',
    total: items.length,
  }
}
