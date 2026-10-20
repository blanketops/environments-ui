import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { TagInput } from './shared/TagInput'
import { YamlPreview } from './shared/YamlPreview'
import { buildsClient } from '../api/client'
import { useConnectivity } from '../hooks/useConnectivity'

// ── Props ─────────────────────────────────────────────────────────────────────
interface BuildFormProps {
  mode?:             'create' | 'patch'
  initialName?:      string
  initialNamespace?: string
  initialValues?: {
    strategy?:    string
    image?:       string
    sourceUrl?:   string
    revision?:    string
    cloneSecret?: string
    buildArgs?:   string[]
  }
}

export const BuildForm: FC<BuildFormProps> = ({
  mode           = 'create',
  initialName    = '',
  initialNamespace = 'blanketops-environments',
  initialValues  = {},
}) => {
  const nav = useNavigate()
  const { health } = useConnectivity()
  const connected  = health?.connected ?? false
  const isPatch    = mode === 'patch'

  const [name,        setName]       = useState(initialName)
  const [namespace,   setNs]         = useState(initialNamespace)
  const [strategy,    setStrategy]   = useState(initialValues.strategy    ?? 'kaniko')
  const [image,       setImage]      = useState(initialValues.image       ?? '')
  const [sourceUrl,   setSrcUrl]     = useState(initialValues.sourceUrl   ?? '')
  const [revision,    setRevision]   = useState(initialValues.revision    ?? 'main')
  const [cloneSecret, setCloneSecret]= useState(initialValues.cloneSecret ?? '')
  const [buildArgs,   setBuildArgs]  = useState<string[]>(initialValues.buildArgs ?? [])
  const [error,       setError]      = useState<string | null>(null)
  const [saving,      setSaving]     = useState(false)

  const spec = {
    contract: {
      image,
      strategy: { kind: 'ClusterBuildStrategy', name: strategy },
      source: {
        url: sourceUrl,
        revision,
        ...(cloneSecret ? { cloneSecret } : {}),
      },
      ...(buildArgs.length ? { buildArgs } : {}),
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected) { setError('Controller is offline'); return }
    setSaving(true); setError(null)
    try {
      if (isPatch) {
        // Patch sends only spec — name + namespace stay immutable
        await buildsClient.patch(initialName, { spec }, initialNamespace)
      } else {
        await buildsClient.create({ metadata: { name, namespace }, spec })
      }
      nav('/builds')
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const submitLabel = saving
    ? (isPatch ? 'patching…' : 'creating…')
    : !connected
      ? 'controller offline'
      : isPatch ? 'patch' : 'create'

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">{isPatch ? `patch build` : 'new build'}</span>
          <span className="kind-badge">Build</span>
          {isPatch && (
            <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text2)' }}>
              {initialName}
            </span>
          )}
          {!connected && (
            <span style={{
              marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--mono)',
              color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} />
              offline
            </span>
          )}
        </div>

        <div className="form-split">
          <form onSubmit={handleSubmit} className="form-body">

            {/* METADATA — name + namespace read-only in patch mode */}
            <div className="form-sec">
              <span className="form-sec-title">METADATA</span>
              <div className="form-sec-line" />
            </div>
            <div className="form-row">
              <Field label="name" required>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="build-for-kaniko-sample"
                  required
                  disabled={isPatch}
                  style={isPatch ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                />
              </Field>
              <Field label="namespace" required>
                <Input
                  value={namespace}
                  onChange={e => setNs(e.target.value)}
                  disabled={isPatch}
                  style={isPatch ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                />
              </Field>
            </div>

            {/* BUILD STRATEGY */}
            <div className="form-sec">
              <span className="form-sec-title">BUILD STRATEGY</span>
              <div className="form-sec-line" />
            </div>
            <IconSelector
              cols={3}
              value={strategy}
              onChange={setStrategy}
              options={[
                { value: 'kaniko',                          icon: 'ti-hammer', label: 'kaniko',     sub: 'Dockerfile-based, daemonless' },
                { value: 'buildpacks-v3',                   icon: 'ti-layers', label: 'buildpacks', sub: 'CNB, no Dockerfile needed' },
                { value: 'buildah-shipwright-managed-push', icon: 'ti-box',    label: 'buildah',    sub: 'OCI-native, full Dockerfile' },
              ]}
            />

            {/* SOURCE & OUTPUT */}
            <div className="form-sec">
              <span className="form-sec-title">SOURCE & OUTPUT</span>
              <div className="form-sec-line" />
            </div>
            <Field label="output image" required hint="Full image ref including registry, name, and tag">
              <Input
                value={image}
                onChange={e => setImage(e.target.value)}
                placeholder="docker.io/org/app:main"
                required
              />
            </Field>
            <Field label="source.url" required>
              <Input
                value={sourceUrl}
                onChange={e => setSrcUrl(e.target.value)}
                placeholder="git@github.com:org/repo.git"
                required
              />
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
                title={connected ? undefined : 'Controller offline'}
              >
                {isPatch && !saving && <i className="ti ti-edit" />}
                {submitLabel}
              </button>
              <button type="button" className="btn" onClick={() => nav('/builds')}>
                cancel
              </button>
            </div>
          </form>

          <div className="form-yaml-panel">
            <YamlPreview value={{
              apiVersion: 'environments.blanketops.dev/v1alpha1',
              kind:       'Build',
              metadata:   { name, namespace },
              spec,
            }} />
          </div>
        </div>
      </div>
    </div>
  )
}