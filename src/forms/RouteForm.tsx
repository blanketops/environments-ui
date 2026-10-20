import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { ToggleField } from './shared/ToggleField'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const RouteForm: FC = () => {
  const nav = useNavigate()
  const [name,          setName]         = useState('')
  const [namespace,     setNs]           = useState('blanketops-environments')
  const [host,          setHost]         = useState('')
  const [path,          setPath]         = useState('/')
  const [runtime,       setRuntime]      = useState('kubernetes.io/container-runtime')
  const [suRef,         setSuRef]        = useState('')
  const [tlsEnabled,    setTlsEnabled]   = useState(true)
  const [issuerStrategy,setIssuer]       = useState('platform')
  const [domainRef,     setDomainRef]    = useState('')
  const [error,         setError]        = useState<string | null>(null)
  const [saving,        setSaving]       = useState(false)

  const spec = {
    host,
    path,
    enabled: true,
    runtime,
    ...(suRef ? { serviceUnitRef: { name: suRef } } : {}),
    tlsEnabled,
    issuerStrategy,
    ...(domainRef ? { domainRef: { name: domainRef } } : {}),
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('routes').create({ metadata: { name, namespace }, spec })
      nav('/routes')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new route</span>
          <span className="kind-badge">Route</span>
        </div>
        <div className="form-split">
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="shopping-app-route" required />
            </Field>
            <Field label="namespace" required>
              <Input value={namespace} onChange={e => setNs(e.target.value)} />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">RUNTIME</span><div className="form-sec-line" /></div>
          <IconSelector cols={2} value={runtime} onChange={setRuntime} options={[
            { value: 'kubernetes.io/container-runtime', icon: 'ti-box',      label: 'container', sub: 'Kubernetes container runtime. Standard pod-based routing.' },
            { value: 'knative.dev/serving',             icon: 'ti-activity', label: 'knative',   sub: 'Knative Serving. Scale-to-zero, traffic splitting.' },
          ]} />

          <div className="form-sec"><span className="form-sec-title">ROUTING</span><div className="form-sec-line" /></div>
          <Field label="host" required>
            <Input value={host} onChange={e => setHost(e.target.value)} placeholder="api.dev.domain.co.za" required />
          </Field>
          <div className="form-row">
            <Field label="path" required>
              <Input value={path} onChange={e => setPath(e.target.value)} placeholder="/" required />
            </Field>
            <Field label="serviceUnitRef.name">
              <Input value={suRef} onChange={e => setSuRef(e.target.value)} placeholder="serviceunit-for-kaniko-web-sample" />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">TLS</span><div className="form-sec-line" /></div>
          <ToggleField value={tlsEnabled} onChange={setTlsEnabled} label="enable TLS"
            sub="cert-manager via ClusterIssuer or namespaced Issuer" />
          <IconSelector cols={2} value={issuerStrategy} onChange={setIssuer} options={[
            { value: 'platform', icon: 'ti-shield',      label: 'platform', sub: 'Wildcard cert via ClusterIssuer + cloudflared. Recommended.' },
            { value: 'custom',   icon: 'ti-certificate', label: 'custom',   sub: 'Per-tenant Issuer via HTTP01 ACME challenge.' },
          ]} />
          <Field label="domainRef.name" hint="Name of the Domain CR owning the cert chain">
            <Input value={domainRef} onChange={e => setDomainRef(e.target.value)} placeholder="shopping-app-domain" />
          </Field>

          {error && <p className="form-submit-error">{error}</p>}
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/routes')}>cancel</button>
          </div>
        </form>
        <div className="form-yaml-panel">
          <YamlPreview value={{ apiVersion: 'networking.environments.blanketops.dev/v1alpha1', kind: 'Route', metadata: { name, namespace }, spec }} />
        </div>
        </div>
      </div>
    </div>
  )
}
