// types/index.ts

export interface Condition {
  type: string
  status: 'True' | 'False' | 'Unknown'
  reason: string
  message: string
  lastTransitionTime: string
  observedGeneration?: number
}

export interface CREvent {
  type: 'Normal' | 'Warning'
  reason: string
  message: string
  count: number
  firstTime: string
  lastTime: string
}

export interface DebugInfo {
  name: string
  namespace: string
  kind: string
  queueDepth: number
  reconcileAttempts: number
  lastReconcileDurationMs: number
  lastReconcileTime: string
  dispatchRoute: string
  mediatorChain: string[]
  workerSlot: number
  lastError?: string
  predicates: Record<string, boolean>
}

export interface CRStatus {
  name: string
  namespace: string
  kind: string
  phase: string
  generation: number
  conditions: Condition[]
  events: CREvent[]
  spec?: unknown
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export interface ListResponse {
  items: CRStatus[]
  resourceVersion: string
  continue?: string
  total: number
}

export interface DeleteResponse {
  name: string
  namespace: string
  kind: string
  deleted: true
}

export type PatchBody = Record<string, unknown>

export type Phase = 'Ready' | 'Running' | 'Pending' | 'Failed' | 'Unknown'

export const ALL_KINDS = [
  'environments',
  'builds',
  'packages',
  'serviceunits',
  'deployments',
  'gitrepositories',
  'githubevents',
  'routes',
  'domains',
  'supplychains',
  'githubwebhooks',
] as const

export type Kind = typeof ALL_KINDS[number]

export const KIND_LABELS: Record<Kind, string> = {
  environments:    'Environments',
  builds:          'Builds',
  packages:        'Packages',
  serviceunits:    'ServiceUnits',
  deployments:     'Deployments',
  gitrepositories: 'GitRepositories',
  githubevents:    'GitHubEvents',
  routes:          'Routes',
  domains:         'Domains',
  supplychains:    'SupplyChains',
  githubwebhooks:  'GitHubWebhooks',
}

export const KIND_GROUP: Record<Kind, string> = {
  environments:    'environments.blanketops.dev/v1alpha1',
  builds:          'environments.blanketops.dev/v1alpha1',
  packages:        'environments.blanketops.dev/v1alpha1',
  serviceunits:    'environments.blanketops.dev/v1alpha1',
  deployments:     'environments.blanketops.dev/v1alpha1',
  gitrepositories: 'sources.blanketops.dev/v1alpha1',
  githubevents:    'events.blanketops.dev/v1alpha1',
  routes:          'networking.environments.blanketops.dev/v1alpha1',
  domains:         'networking.environments.blanketops.dev/v1alpha1',
  supplychains:    'supplychain.blanketops.dev/v1alpha1',
  githubwebhooks:  'supplychain.blanketops.dev/v1alpha1',
}

export const KIND_SINGULAR: Record<Kind, string> = {
  environments:    'Environment',
  builds:          'Build',
  packages:        'Package',
  serviceunits:    'ServiceUnit',
  deployments:     'Deployment',
  gitrepositories: 'GitRepository',
  githubevents:    'GitHubEvent',
  routes:          'Route',
  domains:         'Domain',
  supplychains:    'SupplyChain',
  githubwebhooks:  'GitHubWebhook',
}
