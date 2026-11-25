import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { TagInput } from './shared/TagInput'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

interface ProviderField {
  label: string
  placeholder: string
  required?: boolean
  value: string
  onChange: (v: string) => void
}

const PROVIDER_FIELDS: Record<string, (common: { ssName: string; setSsName: (v: string) => void }) => ProviderField[]> = {
  aws: ({ ssName, setSsName }) => [
    { label: 'secretStore.name', placeholder: 'blanketops-environments-aws', required: true, value: ssName, onChange: setSsName },
    { label: 'secretStore.aws.region', placeholder: 'us-east-1', required: true, value: '', onChange: () => {} },
    { label: 'secretStore.aws.pathPrefix', placeholder: '/blanketops', required: false, value: '', onChange: () => {} },
    { label: 'secretStore.aws.roleArn', placeholder: 'arn:aws:iam::123456789012:role/BlanketOpsIRSA', required: false, value: '', onChange: () => {} },
  ],
  azure: ({ ssName, setSsName }) => [
    { label: 'secretStore.name', placeholder: 'blanketops-environments-azure', required: true, value: ssName, onChange: setSsName },
    { label: 'secretStore.azure.vaultUrl', placeholder: 'https://myvault.vault.azure.net', required: true, value: '', onChange: () => {} },
  ],
  gcp: ({ ssName, setSsName }) => [
    { label: 'secretStore.name', placeholder: 'blanketops-environments-gcp', required: true, value: ssName, onChange: setSsName },
    { label: 'secretStore.gcp.projectId', placeholder: 'my-gcp-project', required: true, value: '', onChange: () => {} },
  ],
  vault: ({ ssName, setSsName }) => [
    { label: 'secretStore.name', placeholder: 'blanketops-environments-vault', required: true, value: ssName, onChange: setSsName },
    { label: 'secretStore.vault.address', placeholder: 'http://vault:8200', required: true, value: '', onChange: () => {} },
    { label: 'secretStore.vault.token', placeholder: 'root-token', required: true, value: '', onChange: () => {} },
    { label: 'secretStore.vault.mount', placeholder: 'secret', required: true, value: '', onChange: () => {} },
  ],
  local: ({ ssName, setSsName }) => [
    { label: 'secretStore.name', placeholder: 'blanketops-environments-local', required: true, value: ssName, onChange: setSsName },
  ],
}

export const EnvironmentForm: FC = () => {
  const nav = useNavigate()
  const [name,     setName]     = useState('')
  const [namespace,setNs]       = useState('blanketops-environments')
  const [appName,  setAppName]  = useState('')
  const [envType,  setEnvType]  = useState('PRODUCTION')
  const [version,  setVersion]  = useState('')
  const [branch,   setBranch]   = useState('main')
  const [gitOwner, setGitOwner] = useState('')
  const [provider, setProvider] = useState('aws')
  const [ssName,   setSsName]   = useState('')
  const [labels,   setLabels]   = useState<string[]>([])
  const [error,    setError]    = useState<string | null>(null)
  const [saving,   setSaving]   = useState(false)

  // Provider-specific extra fields state
  const [extraFields, setExtraFields] = useState<Record<string, string>>({})

  const getProviderFields = () => PROVIDER_FIELDS[provider]?.({ ssName, setSsName }) ?? []

  const spec = {
    applicationName: appName,
    environmentType: envType,
    version: version,
    branch: branch,
    gitOwner: gitOwner,
    secretStore: {
      name: ssName || undefined,
      provider,
      ...extraFields,
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

  // Update extraFields when provider changes
  const fields = getProviderFields()
  if (fields.length > 1) {
    const newExtra: Record<string, string> = {}
    fields.slice(1).forEach(f => { newExtra[f.label.replace('secretStore.', '')] = f.value })
    setExtraFields(newExtra)
  } else {
    setExtraFields({})
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
          <Field label="applicationName" required>
            <Input value={appName} onChange={e => setAppName(e.target.value)} placeholder="payment-api" required />
          </Field>
          <Field label="environmentType" required>
            <Input value={envType} onChange={e => setEnvType(e.target.value)} placeholder="PRODUCTION" required />
          </Field>
          <Field label="version" required>
            <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="1.0.0" required />
          </Field>
          <Field label="branch" required>
            <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" required />
          </Field>
          <Field label="gitOwner" required>
            <Input value={gitOwner} onChange={e => setGitOwner(e.target.value)} placeholder="blanketops" required />
          </Field>
          <Field label="labels" hint="key=value pairs — press Enter to add">
            <TagInput value={labels} onChange={setLabels} placeholder="env=production" />
          </Field>

          <div className="form-sec"><span className="form-sec-title">SECRET STORE</span><div className="form-sec-line" /></div>
          <IconSelector cols={2} value={provider} onChange={setProvider} options={[
            { value: 'aws',   icon: 'ti-brand-aws',   label: 'AWS',   sub: 'Secrets Manager via IRSA' },
            { value: 'azure', icon: 'ti-brand-azure', label: 'Azure', sub: 'Key Vault via Workload Identity' },
            { value: 'gcp',   icon: 'ti-cloud',       label: 'GCP',   sub: 'Secret Manager via Workload Identity' },
            { value: 'vault', icon: 'ti-vault',       label: 'Vault', sub: 'HashiCorp Vault KV v2' },
            { value: 'local', icon: 'ti-server',      label: 'Local', sub: 'In-cluster Secrets (dev only)' },
          ]} />

          {fields.map((field, idx) => (
            <Field key={idx} label={field.label} hint={field.required ? 'required' : 'optional'}>
              <Input
                value={idx === 0 ? ssName : extraFields[field.label.replace('secretStore.', '')] || ''}
                onChange={e => {
                  if (idx === 0) setSsName(e.target.value)
                  else setExtraFields(prev => ({ ...prev, [field.label.replace('secretStore.', '')]: e.target.value }))
                }}
                placeholder={field.placeholder}
                required={field.required}
              />
            </Field>
          ))}

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
