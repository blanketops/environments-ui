import { useState, useEffect, useCallback } from 'react'

export interface HealthStatus {
  status: string
  connected: boolean
  reason?: string
  store?: string
}

const POLL_MS = 3000

export function useConnectivity() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [checking, setChecking] = useState(true)

  const check = useCallback(async () => {
    console.log('[connectivity] checking...')
    setChecking(true)

    try {
      // Add cache-busting query param so browser never caches
      const res = await fetch(`/health?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })

      console.log('[connectivity] response status:', res.status)

      if (!res.ok) {
        const text = await res.text()
        console.log('[connectivity] error body:', text)
        setHealth({
          status: 'unavailable',
          connected: false,
          reason: `HTTP ${res.status}: ${text.slice(0, 100)}`,
        })
        return
      }

      const data = await res.json()
      console.log('[connectivity] success:', data)
      setHealth(data as HealthStatus)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[connectivity] fetch failed:', msg)
      setHealth({
        status: 'unavailable',
        connected: false,
        reason: msg,
      })
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    check()
    const id = setInterval(check, POLL_MS)
    return () => clearInterval(id)
  }, [check])

  return { health, checking, recheck: check }
}