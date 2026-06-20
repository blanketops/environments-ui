import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { TagInput } from './shared/TagInput'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'
import { useConnectivity } from '../hooks/useConnectivity'

export const BuildForm: FC = () => {
  const nav = useNavigate()
  const { health } = useConnectivity()
  const connected = health?.connected ?? false

  const [name,       setName]    = useState('')
  const [namespace,  setNs]      = useState('blanketops-environments')
  const [strategy,   setStrategy]= useState('kaniko')
  const [image,      setImage]   = useState('')
  const [sourceUrl,  setSrcUrl]  = useState('')
  const [revision,   setRevision]= useState('main')
  const [cloneSecret,setCloneSecret] = useState('')
  const [buildArgs,  setBuildArgs]   = useState<string[]>([])
  const [error,      setError]   = useState<string | null>(null)
  const [saving,     setSaving]  = useState(false)

  const spec = {
    contract: {
      image,
      strategy: { kind: 'ClusterBuildStrategy', name: strategy },
      source: { url: sourceUrl, revision, ...(cloneSecret ? { cloneSecret } : {}) },
      ...(buildArgs.length ? { buildArgs } : {}),
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected) {
      setError('Controller is offline — cannot create builds')
      return
    }
    setSaving(true); setError(null)
    try {
      await client('builds').create({ metadata: { name, namespace }, spec })
      nav('/builds')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new build</span>
          <span className="kind-badge">Build</span>
          {!connected && (
            <span
              title="Controller unreachable"
              style={{
                marginLeft: 'auto',
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              offline
            </span>
          )}
        </div>
        <div className="form-split">
          <form onSubmit={handleSubmit} className="form-body">
            <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
            <div className="form-row">
              <Field label="name" required>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="build-for-kaniko-sample" required />
              </Field>
              <Field label="namespace" required>
                <Input value={namespace} onChange={e => setNs(e.target.value)} />
              </Field>
            </div>

            <div className="form-sec"><span className="form-sec-title">BUILD STRATEGY</span><div className="form-sec-line" /></div>
            <IconSelector cols={3} value={strategy} onChange={setStrategy} options={[
              { value: 'kaniko',                           icon: 'ti-hammer',         label: 'kaniko',     sub: 'Dockerfile-based, daemonless' },
              { value: 'buildpacks-v3',                    icon: 'ti-layers',         label: 'buildpacks', sub: 'CNB, no Dockerfile needed' },
              { value: 'buildah-shipwright-managed-push',  icon: 'ti-box',            label: 'buildah',    sub: 'OCI-native, full Dockerfile' },
            ]} />

            <div className="form-sec"><span className="form-sec-title">SOURCE & OUTPUT</span><div className="form-sec-line" /></div>
            <Field label="output image" required hint="Full image ref including registry, name, and tag">
              <Input value={image} onChange={e => setImage(e.target.value)} placeholder="docker.io/org/app:main" required />
            </Field>
            <Field label="source.url" required>
              <Input value={sourceUrl} onChange={e => setSrcUrl(e.target.value)} placeholder="git@github.com:org/repo.git" required />
            </Field>
            <div className="form-row">
              <Field label="source.revision">
                <Input value={revision} onChange={e => setRevision(e.target.value)} placeholder="main" />
              </Field>
              <Field label="source.cloneSecret" hint="Kubernetes Secret name">
                <Input value={cloneSecret} onChange={e => setCloneSecret(e.target.value)} placeholder="github-ssh-credentials" />
              </Field>
            </div>
            <Field label="buildArgs" hint="KEY=VALUE pairs — press Enter to add">
              <TagInput value={buildArgs} onChange={setBuildArgs} placeholder="NODE_ENV=production" />
            </Field>

            {error && <p className="form-submit-error">{error}</p>}
            <div className="form-footer">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !connected}
                title={connected ? 'Submit build' : 'Controller offline — cannot create builds'}
              >
                {saving ? 'creating…' : connected ? 'create' : 'controller offline'}
              </button>
              <button type="button" className="btn" onClick={() => nav('/builds')}>cancel</button>
            </div>
          </form>
          <div className="form-yaml-panel">
            <YamlPreview value={{ apiVersion: 'environments.blanketops.dev/v1alpha1', kind: 'Build', metadata: { name, namespace }, spec }} />
          </div>
        </div>
      </div>
    </div>
  )
}