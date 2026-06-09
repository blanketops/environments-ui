import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const GitRepositoryForm: FC = () => {
  const nav = useNavigate()
  const [name,       setName]      = useState('')
  const [namespace,  setNs]        = useState('blanketops-environments')
  const [url,        setUrl]       = useState('')
  const [branch,     setBranch]    = useState('main')
  const [secretRef,  setSecretRef] = useState('')
  const [hookUrl,    setHookUrl]   = useState('')
  const [interval,   setInterval]  = useState('1m')
  const [error,      setError]     = useState<string | null>(null)
  const [saving,     setSaving]    = useState(false)

  const spec = {
    contract: {
      provider: 'github',
      repository: {
        url,
        ref: { branch },
        ...(secretRef ? { cloneSecret: secretRef } : {}),
      },
      ...(hookUrl ? { hookUrl } : {}),
      webhooks: [{ events: ['push', 'pull_request'] }],
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('gitrepositories').create({ metadata: { name, namespace }, spec })
      nav('/gitrepositories')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new git repository</span>
          <span className="kind-badge">GitRepository</span>
        </div>
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="gitrepository-for-kaniko-sample" required />
            </Field>
            <Field label="namespace" required>
              <Input value={namespace} onChange={e => setNs(e.target.value)} />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">REPOSITORY</span><div className="form-sec-line" /></div>
          <Field label="url" required hint="SSH recommended for private repos">
            <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="git@github.com:org/repo.git" required />
          </Field>
          <div className="form-row">
            <Field label="branch" required>
              <Input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" required />
            </Field>
            <Field label="cloneSecret" hint="Leave blank if public">
              <Input value={secretRef} onChange={e => setSecretRef(e.target.value)} placeholder="github-ssh-credentials" />
            </Field>
          </div>
          <Field label="hookUrl" hint="Cloudflare tunnel URL for webhook delivery">
            <Input value={hookUrl} onChange={e => setHookUrl(e.target.value)} placeholder="https://xxx.trycloudflare.com/" />
          </Field>

          <div className="form-sec"><span className="form-sec-title">SYNC INTERVAL</span><div className="form-sec-line" /></div>
          <IconSelector cols={3} value={interval} onChange={setInterval} options={[
            { value: '30s', icon: 'ti-bolt',         label: '30s', sub: 'High frequency polling' },
            { value: '1m',  icon: 'ti-clock',        label: '1m',  sub: 'Standard' },
            { value: '5m',  icon: 'ti-clock-pause',  label: '5m',  sub: 'Relaxed' },
          ]} />

          {error && <p className="form-submit-error">{error}</p>}
          <YamlPreview value={{ apiVersion: 'sources.blanketops.dev/v1alpha1', kind: 'GitRepository', metadata: { name, namespace }, spec }} />
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/gitrepositories')}>cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
