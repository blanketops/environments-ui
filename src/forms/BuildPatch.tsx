import { useEffect, useState, type FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { buildsClient } from '../api/client'
import { BuildForm } from '../forms/BuildForm'
import type { CRStatus } from '../types'

// Mounted at /builds/:namespace/:name/patch
// Fetches the existing Build CR, extracts spec fields, renders BuildForm in patch mode.

export const BuildPatch: FC = () => {
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>()
  const nav = useNavigate()

  const [cr,      setCr]      = useState<CRStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    if (!namespace || !name) return
    setLoading(true)
    buildsClient
      .get(name, namespace)
      .then(setCr)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false))
  }, [namespace, name])

  if (loading) return (
    <div className="loading-state">
      <div className="spinner-lg" />
      loading build…
    </div>
  )

  if (error) return (
    <div className="loading-state">
      <span className="list-error">
        <i className="ti ti-alert-circle" style={{ marginRight: 6 }} />
        {error}
      </span>
      <button className="btn" onClick={() => nav('/builds')}>back</button>
    </div>
  )

  if (!cr) return null

  // Pull initial values out of the CR spec
  // spec.contract mirrors what BuildForm produces
  const contract = (cr.spec as Record<string, unknown>)?.contract as Record<string, unknown> ?? {}
  const source   = contract.source   as Record<string, unknown> ?? {}
  const stratObj = contract.strategy as Record<string, unknown> ?? {}

  return (
    <BuildForm
      mode="patch"
      initialName={cr.name}
      initialNamespace={cr.namespace}
      initialValues={{
        strategy:    String(stratObj.name   ?? 'kaniko'),
        image:       String(contract.image  ?? ''),
        sourceUrl:   String(source.url      ?? ''),
        revision:    String(source.revision ?? 'main'),
        cloneSecret: String(source.cloneSecret ?? ''),
        buildArgs:   Array.isArray(contract.buildArgs)
                       ? (contract.buildArgs as string[])
                       : [],
      }}
    />
  )
}