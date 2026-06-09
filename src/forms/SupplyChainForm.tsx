import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { ToggleField } from './shared/ToggleField'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const SupplyChainForm: FC = () => {
  const nav = useNavigate()
  const [name,        setName]        = useState('')
  const [namespace,   setNs]          = useState('default')
  const [repository,  setRepo]        = useState('')
  const [webhookHost, setWebhookHost] = useState('')
  const [registry,    setRegistry]    = useState('docker.io')
  const [imageName,   setImageName]   = useState('')
  const [sign,        setSign]        = useState(true)
  const [attest,      setAttest]      = useState(true)
  const [buildpacks,  setBuildpacks]  = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [saving,      setSaving]      = useState(false)

  const spec = {
    repository,
    webhookHost,
    image: { registry, name: imageName, tagStrategy: 'git-sha' },
    steps: { buildpacks, sign, attest },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await client('supplychains').create({ metadata: { name, namespace }, spec })
      nav('/supplychains')
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new supply chain</span>
          <span className="kind-badge">SupplyChain</span>
        </div>
        <form onSubmit={handleSubmit} className="form-body">
          <Field label="name" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="my-supply-chain" required />
          </Field>
          <Field label="namespace">
            <Input value={namespace} onChange={e => setNs(e.target.value)} placeholder="default" />
          </Field>
          <Field label="repository" required>
            <Input value={repository} onChange={e => setRepo(e.target.value)} placeholder="owner/repo" required />
          </Field>
          <Field label="webhookHost" required>
            <Input value={webhookHost} onChange={e => setWebhookHost(e.target.value)} placeholder="host.example.com" required />
          </Field>
          <Field label="image.registry">
            <Input value={registry} onChange={e => setRegistry(e.target.value)} placeholder="docker.io" />
          </Field>
          <Field label="image.name" required>
            <Input value={imageName} onChange={e => setImageName(e.target.value)} placeholder="org/image" required />
          </Field>
          <ToggleField label="steps.buildpacks" value={buildpacks} onChange={setBuildpacks} />
          <ToggleField label="steps.sign"       value={sign}       onChange={setSign} />
          <ToggleField label="steps.attest"     value={attest}     onChange={setAttest} />

          {error && <p className="form-submit-error">{error}</p>}

          <YamlPreview value={{ apiVersion: 'supplychain.blanketops.dev/v1alpha1', kind: 'SupplyChain', metadata: { name, namespace }, spec }} />

          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'creating…' : 'create'}
            </button>
            <button type="button" className="btn" onClick={() => nav('/supplychains')}>cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
