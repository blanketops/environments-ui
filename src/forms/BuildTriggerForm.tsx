import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { TagInput } from './shared/TagInput'
import { ToggleField } from './shared/ToggleField'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const BuildTriggerForm: FC = () => {
  const nav = useNavigate()
  const [name,           setName]     = useState('')
  const [namespace,      setNs]       = useState('blanketops-environments')
  const [branch,         setBranch]   = useState('main')
  const [buildRef,       setBuildRef] = useState('')
  const [repoRef,        setRepoRef]  = useState('')
  const [filters,        setFilters]  = useState<string[]>([])
  const [pauseOnFailure, setPause]    = useState(true)
  const [allowConcurrent,setAllow]    = useState(false)
  const [error,          setError]    = useState<string | null>(null)
  const [saving,         setSaving]   = useState(false)

  const spec = {
    contract: {
      branch,
      buildRef,
      repositoryRef: repoRef,
      pauseOnFailure,
      allowConcurrentRuns: allowConcurrent,
      ...(filters.length ? { filters: { branches: filters } } : {}),
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('buildtriggers').create({ metadata: { name, namespace }, spec })
      nav('/buildtriggers')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new build trigger</span>
          <span className="kind-badge">BuildTrigger</span>
        </div>
        <div className="form-split">
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="buildtrigger-for-kaniko-sample" required />
            </Field>
            <Field label="namespace" required>
              <Input value={namespace} onChange={e => setNs(e.target.value)} />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">REFERENCES</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="buildRef.name" required hint="Name of the Build CR">
              <Input value={buildRef} onChange={e => setBuildRef(e.target.value)} placeholder="build-for-kaniko-sample" required />
            </Field>
            <Field label="repositoryRef.name" required hint="Name of the GitRepository CR">
              <Input value={repoRef} onChange={e => setRepoRef(e.target.value)} placeholder="gitrepository-for-kaniko-sample" required />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">WATCH CONFIG</span><div className="form-sec-line" /></div>
          <Field label="branch" required>
            <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" required />
          </Field>
          <Field label="filters.branches" hint="Additional branch patterns — wildcards supported (feature/*)">
            <TagInput value={filters} onChange={setFilters} placeholder="feature/*" />
          </Field>

          <div className="form-sec"><span className="form-sec-title">BEHAVIOUR</span><div className="form-sec-line" /></div>
          <ToggleField value={pauseOnFailure} onChange={setPause} label="pause on build failure"
            sub="Auto-pauses this trigger when the last BuildRun fails" />
          <ToggleField value={allowConcurrent} onChange={setAllow} label="allow concurrent runs"
            sub="Allow a new BuildRun before the previous one completes" />

          {error && <p className="form-submit-error">{error}</p>}
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/buildtriggers')}>cancel</button>
          </div>
        </form>
        <div className="form-yaml-panel">
          <YamlPreview value={{ apiVersion: 'environments.blanketops.dev/v1alpha1', kind: 'BuildTrigger', metadata: { name, namespace }, spec }} />
        </div>
        </div>
      </div>
    </div>
  )
}
