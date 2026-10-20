import { useState, useEffect, useCallback, useRef } from 'react'
import {
  list, getResource, getEvents, getDebug, deleteResource, patchResource, APIError,
} from '../api/client'
import type { CRStatus, ListResponse, CREvent, DebugInfo, PatchBody } from '../types'

// ── useList ───────────────────────────────────────────────────────────────────
// Fetches on mount then polls silently every `pollMs` ms.
// The loading spinner only shows on the first fetch — subsequent polls update
// data in the background without re-triggering the loading state.

export function useList(kind: string, namespace = '', pollMs = 4000) {
  const [data,    setData]    = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // silent = true → don't set loading, just update data
  const doFetch = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await list(kind, namespace)
      setData(res)
    } catch (e) {
      setError(e instanceof APIError ? e.message : String(e))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [kind, namespace])

  useEffect(() => {
    doFetch(false)                                    // initial fetch — show spinner
    if (pollMs <= 0) return
    const id = setInterval(() => doFetch(true), pollMs) // subsequent — silent
    return () => clearInterval(id)
  }, [doFetch, pollMs])

  return { data, loading, error, refetch: () => doFetch(false) }
}

// ── useResource ───────────────────────────────────────────────────────────────
// Polls at `activePollMs` when the resource is Running/Pending (transitioning),
// and at `idlePollMs` when it has reached a terminal state.
// This keeps the detail drawer live without hammering the API.

export function useResource(
  kind:          string,
  namespace:     string,
  name:          string,
  activePollMs = 2000,   // fast poll while transitioning
  idlePollMs   = 6000,   // slow poll when terminal
) {
  const [data,    setData]    = useState<CRStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Keep a ref to the current phase so the interval callback can read it
  // without needing to be re-created every time data changes.
  const phaseRef = useRef<string>('')

  const doFetch = useCallback(async (silent = false) => {
    if (!name) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const res = await getResource(kind, namespace, name)
      setData(res)
      phaseRef.current = res.phase
    } catch (e) {
      setError(e instanceof APIError ? e.message : String(e))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [kind, namespace, name])

  useEffect(() => {
    doFetch(false)  // initial

    // Dynamic interval — checks phaseRef on every tick to decide speed
    let id: ReturnType<typeof setInterval>

    const schedule = () => {
      const transitioning = ['Running', 'Pending', 'Progressing'].includes(phaseRef.current)
      const delay = transitioning ? activePollMs : idlePollMs
      id = setTimeout(() => {
        doFetch(true).then(schedule)  // chain: fetch → schedule next
      }, delay)
    }

    schedule()
    return () => clearTimeout(id)
  }, [doFetch, activePollMs, idlePollMs])

  const patch = useCallback(async (body: PatchBody) => {
    const updated = await patchResource(kind, namespace, name, body)
    setData(updated)
    phaseRef.current = updated.phase
    return updated
  }, [kind, namespace, name])

  const remove = useCallback(async () => {
    return deleteResource(kind, namespace, name)
  }, [kind, namespace, name])

  return { data, loading, error, refetch: () => doFetch(false), patch, remove }
}

// ── useEvents ─────────────────────────────────────────────────────────────────

export function useEvents(kind: string, namespace: string, name: string) {
  const [data,    setData]    = useState<CREvent[]>([])
  const [loading, setLoading] = useState(false)

  const doFetch = useCallback(async () => {
    if (!name) return
    setLoading(true)
    try   { setData(await getEvents(kind, namespace, name)) }
    catch { setData([]) }
    finally { setLoading(false) }
  }, [kind, namespace, name])

  useEffect(() => { doFetch() }, [doFetch])

  return { data, loading, refetch: doFetch }
}

// ── useDebug ──────────────────────────────────────────────────────────────────

export function useDebug(
  kind:      string,
  namespace: string,
  name:      string,
  enabled  = false,
) {
  const [data,    setData]    = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const doFetch = useCallback(async () => {
    if (!name || !enabled) return
    setLoading(true)
    setError(null)
    try   { setData(await getDebug(kind, namespace, name)) }
    catch (e) { setError(e instanceof APIError ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [kind, namespace, name, enabled])

  useEffect(() => { doFetch() }, [doFetch])

  return { data, loading, error, refetch: doFetch }
}