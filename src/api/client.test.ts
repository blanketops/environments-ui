/**
 * api/client.test.ts
 *
 * Covers all 7 operations: list, get, create, patch, delete, events, debug.
 * Runs in mock mode (VITE_API_BASE unset).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  list, getResource, create, patchResource, deleteResource, getEvents, getDebug,
  environmentsClient, buildsClient, routesClient, domainsClient,
  APIError, USE_MOCK,
} from './client'
import { resetMockStore } from '../store/mock'

beforeEach(() => {
  resetMockStore()
})

// ── Sanity ────────────────────────────────────────────────────────────────────

describe('USE_MOCK', () => {
  it('is true in test environment', () => {
    expect(USE_MOCK).toBe(true)
  })
})

// ── list ──────────────────────────────────────────────────────────────────────

describe('list', () => {
  it('returns all environments', async () => {
    const res = await list('environments')
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.total).toBe(res.items.length)
  })

  it('returns correct kind on all 13 CR types', async () => {
    const kinds = [
      'environments', 'builds', 'buildtriggers', 'packages', 'serviceunits',
      'deployments', 'gitrepositories', 'githubevents', 'githubpayloads',
      'routes', 'domains', 'supplychains', 'githubwebhooks',
    ]
    for (const kind of kinds) {
      const res = await list(kind)
      expect(res.items.length).toBeGreaterThan(0)
      expect(res.items[0].kind).toBe(kind)
    }
  })

  it('returns empty for unknown kind', async () => {
    const res = await list('unknown-kind')
    expect(res.items).toHaveLength(0)
    expect(res.total).toBe(0)
  })
})

// ── get ───────────────────────────────────────────────────────────────────────

describe('getResource', () => {
  it('returns a known Ready environment', async () => {
    const cr = await getResource('environments', 'blanketops-environments', 'environment-sample')
    expect(cr.name).toBe('environment-sample')
    expect(cr.phase).toBe('Ready')
  })

  it('throws APIError 404 for missing resource', async () => {
    const err = await getResource('environments', 'blanketops-system', 'does-not-exist').catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(404)
    expect((err as APIError).reason).toBe('NotFound')
  })

  it('returns a failed build', async () => {
    const cr = await getResource('builds', 'blanketops-system', 'build-gateway')
    expect(cr.phase).toBe('Failed')
    expect(cr.conditions[0].status).toBe('False')
  })

  it('returns a Running environment', async () => {
    const cr = await getResource('environments', 'blanketops-environments', 'dev-sandbox-001')
    expect(cr.phase).toBe('Running')
  })
})

// ── create ────────────────────────────────────────────────────────────────────

describe('create', () => {
  it('creates a new environment and it appears in list', async () => {
    const body = {
      apiVersion: 'environments.blanketops.dev/v1alpha1',
      kind: 'Environment',
      metadata: { name: 'env-test-create', namespace: 'blanketops-system' },
      spec: { envType: 'dev' },
    }
    const cr = await create('environments', 'blanketops-system', body)
    expect(cr.name).toBe('env-test-create')
    expect(cr.phase).toBe('Pending')
    expect(cr.conditions[0].reason).toBe('Initializing')

    const res = await list('environments')
    expect(res.items.find(i => i.name === 'env-test-create')).toBeTruthy()
  })

  it('throws 409 if resource already exists', async () => {
    const body = { metadata: { name: 'environment-sample', namespace: 'blanketops-environments' }, spec: {} }
    const err = await create('environments', 'blanketops-environments', body).catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(409)
    expect((err as APIError).reason).toBe('AlreadyExists')
  })

  it('throws 400 for unknown kind', async () => {
    const err = await create('unknownkind', 'ns', {}).catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(400)
  })

  it('newly created resource starts in Pending phase', async () => {
    const cr = await create('builds', 'blanketops-system', {
      metadata: { name: 'build-new' },
      spec: { strategy: { name: 'kaniko' } },
    })
    expect(cr.phase).toBe('Pending')
    expect(cr.generation).toBe(1)
    expect(cr.events[0].reason).toBe('Created')
  })
})

// ── patch ─────────────────────────────────────────────────────────────────────

describe('patchResource', () => {
  it('merges spec fields and increments generation', async () => {
    const before = await getResource('environments', 'blanketops-system', 'env-staging')
    const prevGen = before.generation

    const patched = await patchResource('environments', 'blanketops-system', 'env-staging', {
      spec: { envType: 'staging', replicas: 3 },
    })

    expect(patched.generation).toBe(prevGen + 1)
    expect((patched.spec as Record<string, unknown>).replicas).toBe(3)
    expect(patched.conditions[0].reason).toBe('Patching')
  })

  it('throws 404 for unknown resource', async () => {
    const err = await patchResource('environments', 'blanketops-system', 'no-such-env', { spec: {} }).catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(404)
  })

  it('preserves unpatched spec fields', async () => {
    const before = await getResource('builds', 'blanketops-system', 'build-api')
    const origImage = (before.spec as Record<string, unknown>).image

    const patched = await patchResource('builds', 'blanketops-system', 'build-api', {
      spec: { contextPath: './new-context' },
    })

    expect((patched.spec as Record<string, unknown>).image).toBe(origImage)
    expect((patched.spec as Record<string, unknown>).contextPath).toBe('./new-context')
  })

  it('merges labels from metadata', async () => {
    const patched = await patchResource('environments', 'blanketops-environments', 'environment-sample', {
      metadata: { labels: { 'team': 'platform' } },
    })
    expect(patched.labels?.['team']).toBe('platform')
    expect(patched.labels?.['env']).toBe('dev') // original label preserved
  })
})

// ── delete ────────────────────────────────────────────────────────────────────

describe('deleteResource', () => {
  it('deletes a resource and removes it from the store', async () => {
    await create('packages', 'blanketops-system', {
      metadata: { name: 'pkg-to-delete', namespace: 'blanketops-system' },
      spec: { strategy: 'kustomize' },
    })

    const res = await deleteResource('packages', 'blanketops-system', 'pkg-to-delete')
    expect(res.deleted).toBe(true)
    expect(res.name).toBe('pkg-to-delete')

    const listRes = await list('packages')
    expect(listRes.items.find(i => i.name === 'pkg-to-delete')).toBeUndefined()
  })

  it('throws 404 when deleting non-existent resource', async () => {
    const err = await deleteResource('builds', 'blanketops-system', 'build-phantom').catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(404)
  })

  it('patch then delete — resource is gone, second access returns 404', async () => {
    // Covers the predicate concern: a patched resource can still be deleted cleanly,
    // and any subsequent access (edit/read) correctly returns 404.
    await patchResource('serviceunits', 'blanketops-system', 'su-api', { spec: { size: 3 } })
    await deleteResource('serviceunits', 'blanketops-system', 'su-api')

    const err = await getResource('serviceunits', 'blanketops-system', 'su-api').catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(404)
  })

  it('delete then patch — patch returns 404, not a stale update', async () => {
    await deleteResource('builds', 'blanketops-system', 'build-api')
    const err = await patchResource('builds', 'blanketops-system', 'build-api', { spec: {} }).catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(404)
  })
})

// ── events ────────────────────────────────────────────────────────────────────

describe('getEvents', () => {
  it('returns events for a CR with events', async () => {
    const events = await getEvents('builds', 'blanketops-system', 'build-api')
    expect(events.length).toBeGreaterThan(0)
    expect(events[0].type).toMatch(/Normal|Warning/)
    expect(events[0].reason).toBeTruthy()
  })

  it('returns empty array for CR with no events', async () => {
    const events = await getEvents('routes', 'blanketops-system', 'route-api-production')
    expect(Array.isArray(events)).toBe(true)
  })

  it('throws 404 for unknown CR', async () => {
    const err = await getEvents('routes', 'blanketops-system', 'route-ghost').catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(404)
  })

  it('returns Warning events for failed resources', async () => {
    const events = await getEvents('builds', 'blanketops-system', 'build-gateway')
    const warnings = events.filter(e => e.type === 'Warning')
    expect(warnings.length).toBeGreaterThan(0)
  })
})

// ── debug ─────────────────────────────────────────────────────────────────────

describe('getDebug', () => {
  it('returns debug info with all required fields', async () => {
    const info = await getDebug('environments', 'blanketops-environments', 'environment-sample')
    expect(info.name).toBe('environment-sample')
    expect(info.kind).toBe('environments')
    expect(typeof info.queueDepth).toBe('number')
    expect(typeof info.lastReconcileDurationMs).toBe('number')
    expect(Array.isArray(info.mediatorChain)).toBe(true)
    expect(info.mediatorChain.length).toBeGreaterThan(0)
    expect(typeof info.predicates).toBe('object')
  })

  it('queueDepth is -1 for Ready resources', async () => {
    const info = await getDebug('environments', 'blanketops-environments', 'environment-sample')
    expect(info.queueDepth).toBe(-1)
  })

  it('queueDepth is >= 0 for Pending resources', async () => {
    const info = await getDebug('deployments', 'blanketops-system', 'deploy-staging')
    expect(info.queueDepth).toBeGreaterThanOrEqual(0)
  })

  it('includes lastError for Failed resources', async () => {
    const info = await getDebug('builds', 'blanketops-system', 'build-gateway')
    expect(info.lastError).toBeTruthy()
  })

  it('throws 404 for unknown resource', async () => {
    const err = await getDebug('builds', 'blanketops-system', 'build-ghost').catch(e => e)
    expect(err).toBeInstanceOf(APIError)
    expect((err as APIError).status).toBe(404)
  })

  it('dispatchRoute contains kind and Reconciler', async () => {
    const info = await getDebug('routes', 'blanketops-system', 'route-api-production')
    expect(info.dispatchRoute).toContain('routes')
    expect(info.dispatchRoute).toContain('Reconciler')
  })

  it('predicates.NotDeleting is false for Failed resources', async () => {
    const info = await getDebug('builds', 'blanketops-system', 'build-gateway')
    expect(info.predicates.NotDeleting).toBe(false)
  })
})

// ── kindClient convenience wrappers ───────────────────────────────────────────

describe('kindClient wrappers', () => {
  it('environmentsClient.list() works', async () => {
    const res = await environmentsClient.list()
    expect(res.items.length).toBeGreaterThan(0)
  })

  it('buildsClient.get() returns correct resource', async () => {
    const cr = await buildsClient.get('build-api')
    expect(cr.name).toBe('build-api')
  })

  it('routesClient.delete() removes from store', async () => {
    await create('routes', 'blanketops-system', {
      metadata: { name: 'route-temp', namespace: 'blanketops-system' },
      spec: { host: 'temp.dev.blanketops.dev' },
    })
    const res = await routesClient.delete('route-temp')
    expect(res.deleted).toBe(true)
  })

  it('domainsClient.patch() updates spec', async () => {
    const patched = await domainsClient.patch('domain-blanketops-dev', { spec: { mtls: true } })
    expect((patched.spec as Record<string, unknown>).mtls).toBe(true)
  })

  it('buildsClient.debug() returns mediator chain', async () => {
    const info = await buildsClient.debug('build-api')
    expect(info.mediatorChain).toContain('EnsurePrerequisites')
  })
})

// ── APIError ──────────────────────────────────────────────────────────────────

describe('APIError', () => {
  it('is an instance of Error', () => {
    const e = new APIError(422, 'invalid', 'UnprocessableEntity')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(APIError)
  })

  it('carries status, message, reason', () => {
    const e = new APIError(403, 'forbidden', 'Forbidden')
    expect(e.status).toBe(403)
    expect(e.message).toBe('forbidden')
    expect(e.reason).toBe('Forbidden')
    expect(e.name).toBe('APIError')
  })

  it('reason is optional', () => {
    const e = new APIError(500, 'boom')
    expect(e.reason).toBeUndefined()
  })
})
