import { useState, useEffect, useCallback } from 'react'
import { list, getResource, getEvents, getDebug, deleteResource, patchResource, APIError } from '../api/client'
import type { CRStatus, ListResponse, CREvent, DebugInfo, PatchBody } from '../types'

// ── useList ───────────────────────────────────────────────────────────────────

export function useList(kind: string, namespace = '') {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await list(kind, namespace)
      setData(res)
    } catch (e) {
      setError(e instanceof APIError ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [kind, namespace])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ── useResource ───────────────────────────────────────────────────────────────

export function useResource(kind: string, namespace: string, name: string) {
  const [data, setData] = useState<CRStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      setData(await getResource(kind, namespace, name))
    } catch (e) {
      setError(e instanceof APIError ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [kind, namespace, name])

  useEffect(() => { fetch() }, [fetch])

  const patch = useCallback(async (body: PatchBody) => {
    const updated = await patchResource(kind, namespace, name, body)
    setData(updated)
    return updated
  }, [kind, namespace, name])

  const remove = useCallback(async () => {
    return deleteResource(kind, namespace, name)
  }, [kind, namespace, name])

  return { data, loading, error, refetch: fetch, patch, remove }
}

// ── useEvents ─────────────────────────────────────────────────────────────────

export function useEvents(kind: string, namespace: string, name: string) {
  const [data, setData] = useState<CREvent[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!name) return
    setLoading(true)
    try { setData(await getEvents(kind, namespace, name)) }
    catch { setData([]) }
    finally { setLoading(false) }
  }, [kind, namespace, name])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, refetch: fetch }
}

// ── useDebug ──────────────────────────────────────────────────────────────────

export function useDebug(kind: string, namespace: string, name: string, enabled = false) {
  const [data, setData] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!name || !enabled) return
    setLoading(true)
    setError(null)
    try { setData(await getDebug(kind, namespace, name)) }
    catch (e) { setError(e instanceof APIError ? e.message : String(e)) }
    finally { setLoading(false) }
  }, [kind, namespace, name, enabled])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
