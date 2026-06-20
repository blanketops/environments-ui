/**
 * test/factories.test.ts
 *
 * Smoke tests for the factory functions — confirms they produce
 * correctly shaped fixtures and that overrides propagate.
 */

import { describe, it, expect } from 'vitest'
import {
  makeCondition,
  makeFailedCondition,
  makeEvent,
  makeWarningEvent,
  makeEnvironment,
  makeBuild,
  makePackage,
  makeServiceUnit,
  makeDeployment,
  makeGitRepository,
  makeGitHubEvent,
  makeRoute,
  makeDomain,
  makeListResponse,
} from './factories'

describe('makeCondition', () => {
  it('defaults to Ready=True', () => {
    const c = makeCondition()
    expect(c.type).toBe('Ready')
    expect(c.status).toBe('True')
  })

  it('accepts overrides', () => {
    const c = makeCondition({ type: 'Synced', status: 'False' })
    expect(c.type).toBe('Synced')
    expect(c.status).toBe('False')
  })
})

describe('makeFailedCondition', () => {
  it('produces a False/ReconcileError condition', () => {
    const c = makeFailedCondition()
    expect(c.status).toBe('False')
    expect(c.reason).toBe('ReconcileError')
  })
})

describe('makeEvent', () => {
  it('defaults to Normal type', () => {
    expect(makeEvent().type).toBe('Normal')
  })
})

describe('makeWarningEvent', () => {
  it('produces a Warning event', () => {
    expect(makeWarningEvent().type).toBe('Warning')
    expect(makeWarningEvent().reason).toBe('ReconcileError')
  })
})

// ── CR factories ──────────────────────────────────────────────────────────────

const cases = [
  ['Environment', makeEnvironment, 'environments'],
  ['Build', makeBuild, 'builds'],
  ['Package', makePackage, 'packages'],
  ['ServiceUnit', makeServiceUnit, 'serviceunits'],
  ['Deployment', makeDeployment, 'deployments'],
  ['GitRepository', makeGitRepository, 'gitrepositories'],
  ['GitHubEvent', makeGitHubEvent, 'githubevents'],
  ['Route', makeRoute, 'routes'],
  ['Domain', makeDomain, 'domains'],
] as const

for (const [label, factory, kind] of cases) {
  describe(`make${label}`, () => {
    it(`produces a ${kind} CRStatus`, () => {
      const cr = factory()
      expect(cr.kind).toBe(kind)
      expect(cr.namespace).toBe('blanketops-system')
      expect(cr.conditions.length).toBeGreaterThan(0)
      expect(cr.events.length).toBeGreaterThan(0)
    })

    it('accepts name override', () => {
      const cr = factory({ name: 'custom-name' })
      expect(cr.name).toBe('custom-name')
    })

    it('accepts phase override', () => {
      const cr = factory({ phase: 'Pending' })
      expect(cr.phase).toBe('Pending')
    })
  })
}

// ── makeListResponse ──────────────────────────────────────────────────────────

describe('makeListResponse', () => {
  it('wraps items correctly', () => {
    const items = [makeEnvironment(), makeBuild()]
    const list = makeListResponse(items)
    expect(list.total).toBe(2)
    expect(list.items).toHaveLength(2)
    expect(list.resourceVersion).toBeTruthy()
  })

  it('defaults to empty list', () => {
    const list = makeListResponse()
    expect(list.total).toBe(0)
    expect(list.items).toHaveLength(0)
  })
})
