import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { TagInput } from './shared/TagInput'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const EnvironmentForm: FC = () => {
  const nav = useNavigate()
  const [name,     setName]     = useState('')
  const [namespace,setNs]       = useState('blanketops-environments')
  const [provider, setProvider] = useState('aws')
  const [ssName,   setSsName]   = useState('')
  const [labels,   setLabels]   = useState<string[]>([])
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  const spec = {
    contract: {
      secretStore: { name: ssName || undefined, provider },
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const labelMap = labels.length
        ? Object.fromEntries(labels.map(l => l.split('=', 2) as [string, string]))
        : undefined
      await client('environments').create({
        metadata: { name, namespace, ...(labelMap ? { labels: labelMap } : {}) },
        spec,
      })
      nav('/environments')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new environment</span>
          <span className="kind-badge">Environment</span>
        </div>
        <div className="form-split">
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <Field label="name" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="env-production" required />
          </Field>
          <Field label="namespace" required>
            <Input value={namespace} onChange={e => setNs(e.target.value)} />
          </Field>
          <Field label="labels" hint="key=value pairs — press Enter to add">
            <TagInput value={labels} onChange={setLabels} placeholder="env=production" />
          </Field>

          <div className="form-sec"><span className="form-sec-title">SECRET STORE</span><div className="form-sec-line" /></div>
          <IconSelector cols={2} value={provider} onChange={setProvider} options={[
            { value: 'aws',   icon: 'ti-brand-aws',   label: 'AWS',   sub: 'Secrets Manager via IRSA' },
            { value: 'azure', icon: 'ti-brand-azure', label: 'Azure', sub: 'Key Vault via Workload Identity' },
            { value: 'gcp',   icon: 'ti-cloud',       label: 'GCP',   sub: 'Secret Manager via Workload Identity' },
            { value: 'local', icon: 'ti-server',      label: 'Local', sub: 'In-cluster Secrets (dev only)' },
          ]} />
          <Field label="secretStore.name" hint="Name of the ClusterSecretStore or SecretStore CR">
            <Input value={ssName} onChange={e => setSsName(e.target.value)} placeholder="blanketops-environments-aws" />
          </Field>

          {error && <p className="form-submit-error">{error}</p>}
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/environments')}>cancel</button>
          </div>
        </form>
        <div className="form-yaml-panel">
          <YamlPreview value={{ apiVersion: 'environments.blanketops.dev/v1alpha1', kind: 'Environment', metadata: { name, namespace }, spec }} />
        </div>
        </div>
      </div>
    </div>
  )
}
