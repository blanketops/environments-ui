import { MOCK_STORE } from '../store/mock'
import type { CRStatus, ListResponse, DeleteResponse, PatchBody, DebugInfo, CREvent } from '../types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '')
export const USE_MOCK = !BASE

export class APIError extends Error {
  constructor(public readonly status: number, message: string, public readonly reason?: string) {
    super(message); this.name = 'APIError'
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined })
  if (!res.ok) {
    const e = await res.json().catch(() => ({})) as Record<string, string>
    throw new APIError(res.status, e.message ?? res.statusText, e.reason)
  }
  if (res.status === 204) return {} as T
  return res.json() as Promise<T>
}

const hGet    = <T>(p: string)            => req<T>('GET', p)
const hPost   = <T>(p: string, b: unknown) => req<T>('POST', p, b)
const hPatch  = <T>(p: string, b: unknown) => req<T>('PATCH', p, b)
const hDelete = <T>(p: string)            => req<T>('DELETE', p)

const colPath = (kind: string, ns?: string) => ns ? `/api/v1/${kind}?namespace=${ns}` : `/api/v1/${kind}`
const resPath = (kind: string, ns: string, name: string) => `/api/v1/${kind}/${ns}/${name}`
const subPath = (kind: string, ns: string, name: string, sub: string) => `/api/v1/${kind}/${ns}/${name}/${sub}`

function mFind(kind: string, name: string): CRStatus {
  const hit = (MOCK_STORE[kind] ?? []).find(i => i.name === name)
  if (!hit) throw new APIError(404, `${kind}/${name} not found`, 'NotFound')
  return hit
}

function mCreate(kind: string, body: Record<string, unknown>): CRStatus {
  const store = MOCK_STORE[kind]
  if (!store) throw new APIError(400, `Unknown kind: ${kind}`, 'BadRequest')
  const meta = (body.metadata ?? {}) as Record<string, unknown>
  const name = (meta.name as string) ?? `${kind}-${Date.now()}`
  const namespace = (meta.namespace as string) ?? 'blanketops-system'
  if (store.find(i => i.name === name)) throw new APIError(409, `${kind}/${name} already exists`, 'AlreadyExists')
  const cr: CRStatus = {
    name, namespace, kind, phase: 'Pending', generation: 1,
    labels: (meta.labels as Record<string, string>) ?? {},
    spec: body.spec ?? {},
    conditions: [{ type: 'Ready', status: 'False', reason: 'Initializing', message: 'Resource created — reconciliation starting', lastTransitionTime: new Date().toISOString() }],
    events: [{ type: 'Normal', reason: 'Created', message: `${kind} created via BlanketOps UI`, count: 1, firstTime: new Date().toISOString(), lastTime: new Date().toISOString() }],
  }
  store.unshift(cr)
  return cr
}

function mPatch(kind: string, name: string, body: PatchBody): CRStatus {
  const store = MOCK_STORE[kind] ?? []
  const idx = store.findIndex(i => i.name === name)
  if (idx === -1) throw new APIError(404, `${kind}/${name} not found`, 'NotFound')
  const ex = store[idx]
  store[idx] = {
    ...ex,
    generation: ex.generation + 1,
    spec: { ...(ex.spec as Record<string, unknown> ?? {}), ...((body.spec as Record<string, unknown>) ?? {}) },
    labels: body.metadata ? { ...ex.labels, ...(((body.metadata as Record<string, unknown>).labels as Record<string, string>) ?? {}) } : ex.labels,
    conditions: [{ type: 'Ready', status: 'False', reason: 'Patching', message: 'Spec updated — reconciliation starting', lastTransitionTime: new Date().toISOString() }],
  }
  return store[idx]
}

function mDelete(kind: string, name: string): DeleteResponse {
  const store = MOCK_STORE[kind] ?? []
  const idx = store.findIndex(i => i.name === name)
  if (idx === -1) throw new APIError(404, `${kind}/${name} not found`, 'NotFound')
  const cr = store.splice(idx, 1)[0]
  return { name: cr.name, namespace: cr.namespace, kind, deleted: true }
}

function mDebug(kind: string, name: string): DebugInfo {
  const cr = mFind(kind, name)
  return {
    name: cr.name, namespace: cr.namespace, kind,
    queueDepth: cr.phase === 'Pending' ? 1 : -1,
    reconcileAttempts: cr.phase === 'Failed' ? 3 : 1,
    lastReconcileDurationMs: Math.floor(Math.random() * 180) + 20,
    lastReconcileTime: new Date(Date.now() - 30_000).toISOString(),
    dispatchRoute: `${kind}.blanketops.dev/v1alpha1 → GVKRouter → ${kind}Reconciler`,
    mediatorChain: ['EnsurePrerequisites', 'ReconcileSpec', 'UpdateStatus', 'EmitEvent'],
    workerSlot: cr.phase === 'Pending' ? 2 : -1,
    ...(cr.phase === 'Failed' ? { lastError: cr.conditions[0]?.message } : {}),
    predicates: { GenerationChanged: true, LabelMatch: true, NotDeleting: cr.phase !== 'Failed' },
  }
}

export async function list(kind: string, namespace = ''): Promise<ListResponse> {
  if (USE_MOCK) { const items = MOCK_STORE[kind] ?? []; return { items, resourceVersion: 'mock-rv', total: items.length } }
  return hGet<ListResponse>(colPath(kind, namespace || undefined))
}

export async function getResource(kind: string, namespace: string, name: string): Promise<CRStatus> {
  if (USE_MOCK) return mFind(kind, name)
  return hGet<CRStatus>(resPath(kind, namespace, name))
}

export async function create(kind: string, namespace: string, body: unknown): Promise<CRStatus> {
  if (USE_MOCK) return mCreate(kind, body as Record<string, unknown>)
  return hPost<CRStatus>(colPath(kind, namespace), body)
}

export async function patchResource(kind: string, namespace: string, name: string, body: PatchBody): Promise<CRStatus> {
  if (USE_MOCK) return mPatch(kind, name, body)
  return hPatch<CRStatus>(resPath(kind, namespace, name), body)
}

export async function deleteResource(kind: string, namespace: string, name: string): Promise<DeleteResponse> {
  if (USE_MOCK) return mDelete(kind, name)
  return hDelete<DeleteResponse>(resPath(kind, namespace, name))
}

export async function getEvents(kind: string, namespace: string, name: string): Promise<CREvent[]> {
  if (USE_MOCK) return mFind(kind, name).events
  return hGet<CREvent[]>(subPath(kind, namespace, name, 'events'))
}

export async function getDebug(kind: string, namespace: string, name: string): Promise<DebugInfo> {
  if (USE_MOCK) return mDebug(kind, name)
  return hGet<DebugInfo>(subPath(kind, namespace, name, 'debug'))
}

function kindClient(kind: string, defaultNs = 'blanketops-system') {
  return {
    list:   (ns = defaultNs)                                  => list(kind, ns),
    get:    (name: string, ns = defaultNs)                    => getResource(kind, ns, name),
    create: (body: unknown, ns = defaultNs)                   => create(kind, ns, body),
    patch:  (name: string, body: PatchBody, ns = defaultNs)   => patchResource(kind, ns, name, body),
    delete: (name: string, ns = defaultNs)                    => deleteResource(kind, ns, name),
    events: (name: string, ns = defaultNs)                    => getEvents(kind, ns, name),
    debug:  (name: string, ns = defaultNs)                    => getDebug(kind, ns, name),
  }
}

export const environmentsClient   = kindClient('environments')
export const buildsClient          = kindClient('builds')
export const buildTriggersClient   = kindClient('buildtriggers')
export const packagesClient        = kindClient('packages')
export const serviceUnitsClient    = kindClient('serviceunits')
export const deploymentsClient     = kindClient('deployments')
export const gitRepositoriesClient = kindClient('gitrepositories')
export const gitHubEventsClient    = kindClient('githubevents')
export const routesClient          = kindClient('routes')
export const domainsClient         = kindClient('domains')
export const client                = (kind: string) => kindClient(kind)
