import type { CRStatus, ListResponse, DeleteResponse, PatchBody, DebugInfo, CREvent } from '../types'

const BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') ?? ''

export class APIError extends Error {
  constructor(public readonly status: number, message: string, public readonly reason?: string) {
    super(message); this.name = 'APIError'
  }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
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

export async function list(kind: string, namespace = ''): Promise<ListResponse> {
  return hGet<ListResponse>(colPath(kind, namespace || undefined))
}

export async function getResource(kind: string, namespace: string, name: string): Promise<CRStatus> {
  return hGet<CRStatus>(resPath(kind, namespace, name))
}

export async function create(kind: string, namespace: string, body: unknown): Promise<CRStatus> {
  return hPost<CRStatus>(colPath(kind, namespace), body)
}

export async function patchResource(kind: string, namespace: string, name: string, body: PatchBody): Promise<CRStatus> {
  return hPatch<CRStatus>(resPath(kind, namespace, name), body)
}

export async function deleteResource(kind: string, namespace: string, name: string): Promise<DeleteResponse> {
  return hDelete<DeleteResponse>(resPath(kind, namespace, name))
}

export async function getEvents(kind: string, namespace: string, name: string): Promise<CREvent[]> {
  return hGet<CREvent[]>(subPath(kind, namespace, name, 'events'))
}

export async function getDebug(kind: string, namespace: string, name: string): Promise<DebugInfo> {
  return hGet<DebugInfo>(subPath(kind, namespace, name, 'debug'))
}

function kindClient(kind: string, defaultNs = 'default') {
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
export const packagesClient        = kindClient('packages')
export const serviceUnitsClient    = kindClient('serviceunits')
export const deploymentsClient     = kindClient('deployments')
export const gitRepositoriesClient = kindClient('gitrepositories')
export const gitHubEventsClient    = kindClient('githubevents')
export const routesClient          = kindClient('routes')
export const domainsClient         = kindClient('domains')
export const client                = (kind: string) => kindClient(kind)