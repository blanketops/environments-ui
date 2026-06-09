import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { TagInput } from './shared/TagInput'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const GitHubEventForm: FC = () => {
  const nav = useNavigate()
  const [name,          setName]       = useState('')
  const [namespace,     setNs]         = useState('blanketops-environments')
  const [primaryEvt,    setPrimaryEvt] = useState('push')
  const [extraEvents,   setExtraEvents]= useState<string[]>([])
  const [repoRef,       setRepoRef]    = useState('')
  const [branches,      setBranches]   = useState<string[]>([])
  const [webhookSecret, setWebhookSecret] = useState('')
  const [error,         setError]      = useState<string | null>(null)
  const [saving,        setSaving]     = useState(false)

  const allEvents = [primaryEvt, ...extraEvents.filter(e => e !== primaryEvt)]

  const spec = {
    contract: {
      repository: repoRef,
      eventType: primaryEvt,
      ref: branches.length ? `refs/heads/${branches[0]}` : 'refs/heads/main',
      ...(allEvents.length > 1 ? { events: allEvents } : {}),
      ...(branches.length ? { filters: { branches } } : {}),
      ...(webhookSecret ? { webhook: { secretRef: { name: webhookSecret, key: 'secret' } } } : {}),
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('githubevents').create({ metadata: { name, namespace }, spec })
      nav('/githubevents')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new github event</span>
          <span className="kind-badge">GitHubEvent</span>
        </div>
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="githubevent-for-kaniko-sample" required />
            </Field>
            <Field label="namespace" required>
              <Input value={namespace} onChange={e => setNs(e.target.value)} />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">EVENT TYPE</span><div className="form-sec-line" /></div>
          <IconSelector cols={3} value={primaryEvt} onChange={setPrimaryEvt} options={[
            { value: 'push',         icon: 'ti-git-commit',       label: 'push',         sub: 'On branch push' },
            { value: 'pull_request', icon: 'ti-git-pull-request', label: 'pull_request', sub: 'PR open/sync/close' },
            { value: 'release',      icon: 'ti-tag',              label: 'release',      sub: 'On release publish' },
          ]} />
          <Field label="additional event types" hint="workflow_run, deployment, etc.">
            <TagInput value={extraEvents} onChange={setExtraEvents} placeholder="workflow_run" />
          </Field>

          <div className="form-sec"><span className="form-sec-title">SOURCE</span><div className="form-sec-line" /></div>
          <Field label="repository" required hint="owner/repo format">
            <Input value={repoRef} onChange={e => setRepoRef(e.target.value)} placeholder="ntlaletsi70/blanketops-app" required />
          </Field>
          <Field label="branch filters" hint="Leave empty to trigger on all branches">
            <TagInput value={branches} onChange={setBranches} placeholder="main" />
          </Field>
          <Field label="webhook.secretRef.name" hint="Kubernetes Secret containing the GitHub webhook secret">
            <Input value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} placeholder="github-webhook-secret" />
          </Field>

          {error && <p className="form-submit-error">{error}</p>}
          <YamlPreview value={{ apiVersion: 'events.blanketops.dev/v1alpha1', kind: 'GitHubEvent', metadata: { name, namespace }, spec }} />
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/githubevents')}>cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
