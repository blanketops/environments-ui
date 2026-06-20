import { useState, useEffect } from 'react'

export interface HealthStatus {
  status: string
  connected: boolean
  reason?: string
  store?: string
}

export function useConnectivity(pollMs = 5000) {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [checking, setChecking] = useState(true)

  const check = async () => {
    try {
      const res = await fetch('/health')
      const data = await res.json()
      setHealth(data as HealthStatus)
    } catch {
      setHealth({ status: 'unavailable', connected: false, reason: 'Server unreachable' })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    check()
    const id = setInterval(check, pollMs)
    return () => clearInterval(id)
  }, [pollMs])

  return { health, checking, recheck: check }
}