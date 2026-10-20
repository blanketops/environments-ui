import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { TagInput } from './shared/TagInput'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const GitHubWebhookForm: FC = () => {
  const nav = useNavigate()
  const [name,           setName]    = useState('')
  const [namespace,      setNs]      = useState('default')
  const [repository,     setRepo]    = useState('')
  const [supplyChainRef, setScRef]   = useState('')
  const [hookURL,        setHookURL] = useState('')
  const [events,         setEvents]  = useState<string[]>(['push'])
  const [error,          setError]   = useState<string | null>(null)
  const [saving,         setSaving]  = useState(false)

  const spec = {
    repository,
    supplyChainRef: { name: supplyChainRef },
    hookURL,
    events,
    contentType: 'json',
    insecureSSL: false,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await client('githubwebhooks').create({ metadata: { name, namespace }, spec })
      nav('/githubwebhooks')
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
          <span className="card-title">new github webhook</span>
          <span className="kind-badge">GitHubWebhook</span>
        </div>
        <div className="form-split">
        <form onSubmit={handleSubmit} className="form-body">
          <Field label="name" required>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="my-webhook" required />
          </Field>
          <Field label="namespace">
            <Input value={namespace} onChange={e => setNs(e.target.value)} placeholder="default" />
          </Field>
          <Field label="repository" required>
            <Input value={repository} onChange={e => setRepo(e.target.value)} placeholder="owner/repo" required />
          </Field>
          <Field label="supplyChainRef.name" required>
            <Input value={supplyChainRef} onChange={e => setScRef(e.target.value)} placeholder="my-supply-chain" required />
          </Field>
          <Field label="hookURL" required>
            <Input value={hookURL} onChange={e => setHookURL(e.target.value)} placeholder="https://host.example.com" required />
          </Field>
          <Field label="events">
            <TagInput value={events} onChange={setEvents} placeholder="push" />
          </Field>

          {error && <p className="form-submit-error">{error}</p>}
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/githubwebhooks')}>cancel</button>
          </div>
        </form>
        <div className="form-yaml-panel">
          <YamlPreview value={{ apiVersion: 'supplychain.blanketops.dev/v1alpha1', kind: 'GitHubWebhook', metadata: { name, namespace }, spec }} />
        </div>
        </div>
      </div>
    </div>
  )
}
