import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Auto cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Global fetch mock — tests override per-test with vi.mocked(fetch).mockResolvedValueOnce(...)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

export { mockFetch }
