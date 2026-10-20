import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Node 25+ defines its own global localStorage, left undefined unless
// --localstorage-file is given, and it shadows jsdom's. Provide an in-memory
// Storage when the environment has none.
if (!globalThis.localStorage) {
  const data = new Map<string, string>()
  const storage: Storage = {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: k => data.get(k) ?? null,
    key: i => Array.from(data.keys())[i] ?? null,
    removeItem: k => { data.delete(k) },
    setItem: (k, v) => { data.set(k, String(v)) },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
}

// Global fetch mock — tests override per-test with vi.mocked(fetch).mockResolvedValueOnce(...)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

export { mockFetch }
