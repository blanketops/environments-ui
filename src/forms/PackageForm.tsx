import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { ToggleField } from './shared/ToggleField'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const PackageForm: FC = () => {
  const nav = useNavigate()
  const [name,         setName]        = useState('')
  const [namespace,    setNs]          = useState('blanketops-environments')
  const [version,      setVersion]     = useState('')
  const [strategy,     setStrategy]    = useState('kustomization')
  const [stateRepo,    setStateRepo]   = useState('')
  const [statePath,    setStatePath]   = useState('./clusters/dev')
  const [diffEnabled,  setDiffEnabled] = useState(true)
  const [diffTimeout,  setDiffTimeout] = useState('120')
  const [applyTimeout, setApplyTimeout]= useState('300')
  const [error,        setError]       = useState<string | null>(null)
  const [saving,       setSaving]      = useState(false)

  const spec = {
    contract: {
      strategy,
      version,
      stateRepo: { url: stateRepo, strategy, path: statePath },
      packageKappDiff: diffEnabled,
      diff: { enabled: diffEnabled, timeout: Number(diffTimeout) },
      applyTimeout: Number(applyTimeout),
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('packages').create({ metadata: { name, namespace }, spec })
      nav('/packages')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new package</span>
          <span className="kind-badge">Package</span>
        </div>
        <div className="form-split">
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="package-for-kaniko-sample" required />
            </Field>
            <Field label="version" required>
              <Input value={version} onChange={e => setVersion(e.target.value)} placeholder="v1.2.3" required />
            </Field>
          </div>
          <Field label="namespace" required>
            <Input value={namespace} onChange={e => setNs(e.target.value)} />
          </Field>

          <div className="form-sec"><span className="form-sec-title">RECONCILIATION STRATEGY</span><div className="form-sec-line" /></div>
          <IconSelector cols={3} value={strategy} onChange={setStrategy} options={[
            { value: 'kustomization', icon: 'ti-layers-difference', label: 'kustomize', sub: 'Overlay-based manifest rendering' },
            { value: 'helm',          icon: 'ti-package',           label: 'helm',      sub: 'Chart-based release management' },
            { value: 'raw',           icon: 'ti-file-code',         label: 'raw',       sub: 'Plain YAML, no templating' },
          ]} />

          <div className="form-sec"><span className="form-sec-title">STATE REPOSITORY</span><div className="form-sec-line" /></div>
          <Field label="stateRepo.url" required hint="Observed truth — kapp tracks what is actually deployed here">
            <Input value={stateRepo} onChange={e => setStateRepo(e.target.value)} placeholder="git@github.com:org/state.git" required />
          </Field>
          <Field label="stateRepo.path">
            <Input value={statePath} onChange={e => setStatePath(e.target.value)} placeholder="./clusters/dev" />
          </Field>

          <div className="form-sec"><span className="form-sec-title">DIFF OPTIONS</span><div className="form-sec-line" /></div>
          <ToggleField value={diffEnabled} onChange={setDiffEnabled} label="enable kapp-diff"
            sub="Run kapp diff before applying — surfaces changes before they land" />
          <div className="form-row">
            <Field label="diff.timeout (s)">
              <Input type="number" value={diffTimeout} onChange={e => setDiffTimeout(e.target.value)} />
            </Field>
            <Field label="applyTimeout (s)">
              <Input type="number" value={applyTimeout} onChange={e => setApplyTimeout(e.target.value)} />
            </Field>
          </div>

          {error && <p className="form-submit-error">{error}</p>}
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/packages')}>cancel</button>
          </div>
        </form>
        <div className="form-yaml-panel">
          <YamlPreview value={{ apiVersion: 'environments.blanketops.dev/v1alpha1', kind: 'Package', metadata: { name, namespace }, spec }} />
        </div>
        </div>
      </div>
    </div>
  )
}
