import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { TagInput } from './shared/TagInput'
import { ToggleField } from './shared/ToggleField'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const DeploymentForm: FC = () => {
  const nav = useNavigate()
  const [name,          setName]         = useState('')
  const [namespace,     setNs]           = useState('blanketops-environments')
  const [strategy,      setStrategy]     = useState('Rolling')
  const [serviceUnits,  setServiceUnits] = useState<string[]>([])
  const [manifestsRepo, setManifestsRepo]= useState('')
  const [manifestsPath, setManifestsPath]= useState('./overlays/dev')
  const [branch,        setBranch]       = useState('main')
  const [imageAuto,     setImageAuto]    = useState(true)
  const [error,         setError]        = useState<string | null>(null)
  const [saving,        setSaving]       = useState(false)

  const spec = {
    contract: {
      serviceUnits,
      strategy,
      manifestsRepo: { url: manifestsRepo, strategy: 'kustomization', path: manifestsPath },
      branch,
      imageAutomation: imageAuto,
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('deployments').create({ metadata: { name, namespace }, spec })
      nav('/deployments')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new deployment</span>
          <span className="kind-badge">Deployment</span>
        </div>
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="deployment-for-kaniko-sample" required />
            </Field>
            <Field label="namespace" required>
              <Input value={namespace} onChange={e => setNs(e.target.value)} />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">ROLLOUT STRATEGY</span><div className="form-sec-line" /></div>
          <IconSelector cols={3} value={strategy} onChange={setStrategy} options={[
            { value: 'Rolling',   icon: 'ti-refresh',         label: 'Rolling',    sub: 'Gradual pod replacement, zero downtime' },
            { value: 'BlueGreen', icon: 'ti-arrows-exchange', label: 'Blue-Green', sub: 'Full parallel deploy, instant switch' },
            { value: 'Canary',    icon: 'ti-git-branch',      label: 'Canary',     sub: 'Progressive traffic shift with rollback' },
          ]} />

          <div className="form-sec"><span className="form-sec-title">SERVICE UNITS</span><div className="form-sec-line" /></div>
          <Field label="serviceUnits" required hint="Names of ServiceUnit CRs to include">
            <TagInput value={serviceUnits} onChange={setServiceUnits} placeholder="serviceunit-for-kaniko-web-sample" />
          </Field>

          <div className="form-sec"><span className="form-sec-title">MANIFESTS REPOSITORY</span><div className="form-sec-line" /></div>
          <Field label="manifestsRepo.url" required hint="Declared truth — FluxCD Kustomize reconciliation target">
            <Input value={manifestsRepo} onChange={e => setManifestsRepo(e.target.value)} placeholder="git@github.com:org/manifests.git" required />
          </Field>
          <div className="form-row">
            <Field label="manifestsRepo.path">
              <Input value={manifestsPath} onChange={e => setManifestsPath(e.target.value)} placeholder="./overlays/dev" />
            </Field>
            <Field label="branch">
              <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" />
            </Field>
          </div>
          <ToggleField value={imageAuto} onChange={setImageAuto} label="image automation"
            sub="FluxCD imageAutomation — auto-updates image tags in the manifests repo" />

          {error && <p className="form-submit-error">{error}</p>}
          <YamlPreview value={{ apiVersion: 'environments.blanketops.dev/v1alpha1', kind: 'Deployment', metadata: { name, namespace }, spec }} />
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/deployments')}>cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
