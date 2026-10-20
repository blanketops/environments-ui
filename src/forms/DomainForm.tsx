import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { ToggleField } from './shared/ToggleField'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const DomainForm: FC = () => {
  const nav = useNavigate()
  const [name,        setName]       = useState('')
  const [namespace,   setNs]         = useState('blanketops-environments')
  const [host,        setHost]       = useState('')
  const [tlsStrategy, setTlsStrategy]= useState('platform')
  const [mtls,        setMtls]       = useState(false)
  const [renewBefore, setRenewBefore]= useState('720h')
  const [tunnelId,    setTunnelId]   = useState('')
  const [error,       setError]      = useState<string | null>(null)
  const [saving,      setSaving]     = useState(false)

  const spec = {
    host,
    tlsStrategy,
    mtls: { enforced: mtls },
    renewBefore,
    ...(tunnelId ? { cloudflaredTunnelId: tunnelId } : {}),
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('domains').create({ metadata: { name, namespace }, spec })
      nav('/domains')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new domain</span>
          <span className="kind-badge">Domain</span>
        </div>
        <div className="form-split">
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="shopping-app-domain" required />
            </Field>
            <Field label="namespace" required>
              <Input value={namespace} onChange={e => setNs(e.target.value)} />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">DOMAIN</span><div className="form-sec-line" /></div>
          <Field label="host" required hint="Wildcard cert covers *.<host>">
            <Input value={host} onChange={e => setHost(e.target.value)} placeholder="api.dev.domain.co.za" required />
          </Field>

          <div className="form-sec"><span className="form-sec-title">TLS STRATEGY</span><div className="form-sec-line" /></div>
          <IconSelector cols={2} value={tlsStrategy} onChange={setTlsStrategy} options={[
            { value: 'platform', icon: 'ti-shield',      label: 'platform', sub: 'Wildcard cert via cloudflared DaemonSet + ClusterIssuer' },
            { value: 'custom',   icon: 'ti-certificate', label: 'custom',   sub: 'Per-tenant namespaced Issuer via HTTP01 ACME challenge' },
          ]} />

          <div className="form-sec"><span className="form-sec-title">PKI & mTLS</span><div className="form-sec-line" /></div>
          <ToggleField value={mtls} onChange={setMtls} label="enforce mTLS"
            sub="blanketops-proxy mTLS via blanketK PKI — Root1 (platform) + Root2 (per-cluster)" />
          <div className="form-row">
            <Field label="renewBefore">
              <Input value={renewBefore} onChange={e => setRenewBefore(e.target.value)} placeholder="720h" />
            </Field>
            <Field label="cloudflaredTunnelId" hint="Required for DNS01/platform strategy">
              <Input value={tunnelId} onChange={e => setTunnelId(e.target.value)} placeholder="abc-123-def" />
            </Field>
          </div>

          {error && <p className="form-submit-error">{error}</p>}
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/domains')}>cancel</button>
          </div>
        </form>
        <div className="form-yaml-panel">
          <YamlPreview value={{ apiVersion: 'networking.environments.blanketops.dev/v1alpha1', kind: 'Domain', metadata: { name, namespace }, spec }} />
        </div>
        </div>
      </div>
    </div>
  )
}
