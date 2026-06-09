import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input, Select } from './shared/FormField'
import { IconSelector } from './shared/IconSelector'
import { TagInput } from './shared/TagInput'
import { YamlPreview } from './shared/YamlPreview'
import { client } from '../api/client'

export const ServiceUnitForm: FC = () => {
  const nav = useNavigate()
  const [name,     setName]    = useState('')
  const [namespace,setNs]      = useState('blanketops-environments')
  const [type,     setType]    = useState('build')
  const [buildRef, setBuildRef]= useState('')
  const [imageRef, setImageRef]= useState('')
  const [port,     setPort]    = useState('8080')
  const [protocol, setProtocol]= useState('TCP')
  const [envVars,  setEnvVars] = useState<string[]>([])
  const [error,    setError]   = useState<string | null>(null)
  const [saving,   setSaving]  = useState(false)

  const spec = {
    contract: {
      type,
      ...(type === 'build' && buildRef ? { buildRef: { name: buildRef } } : {}),
      image: imageRef,
      containerPort: Number(port),
      size: 1,
      ...(envVars.length ? {
        env: envVars.map(e => { const p = e.split('='); return { name: p[0], value: p.slice(1).join('=') } }),
      } : {}),
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      await client('serviceunits').create({ metadata: { name, namespace }, spec })
      nav('/serviceunits')
    } catch (err) { setError(String(err)) }
    finally { setSaving(false) }
  }

  return (
    <div className="form-page">
      <div className="card">
        <div className="card-hdr">
          <span className="card-title">new service unit</span>
          <span className="kind-badge">ServiceUnit</span>
        </div>
        <form onSubmit={handleSubmit} className="form-body">
          <div className="form-sec"><span className="form-sec-title">METADATA</span><div className="form-sec-line" /></div>
          <div className="form-row">
            <Field label="name" required>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="serviceunit-for-kaniko-web-sample" required />
            </Field>
            <Field label="namespace" required>
              <Input value={namespace} onChange={e => setNs(e.target.value)} />
            </Field>
          </div>

          <div className="form-sec"><span className="form-sec-title">UNIT TYPE</span><div className="form-sec-line" /></div>
          <IconSelector cols={2} value={type} onChange={setType} options={[
            { value: 'build',  icon: 'ti-hammer', label: 'build',  sub: 'Image produced by a Build CR. Tracks the latest successful BuildRun.' },
            { value: 'static', icon: 'ti-photo',  label: 'static', sub: 'Pinned image reference. You control when to update the tag.' },
          ]} />

          <div className="form-sec"><span className="form-sec-title">IMAGE CONFIG</span><div className="form-sec-line" /></div>
          {type === 'build' && (
            <Field label="buildRef.name" hint="Name of the Build CR">
              <Input value={buildRef} onChange={e => setBuildRef(e.target.value)} placeholder="build-for-kaniko-sample" />
            </Field>
          )}
          <Field label="image" required hint="Full image ref. For build type, used as fallback until first BuildRun.">
            <Input value={imageRef} onChange={e => setImageRef(e.target.value)} placeholder="docker.io/org/app:main" required />
          </Field>
          <div className="form-row">
            <Field label="containerPort">
              <Input type="number" value={port} onChange={e => setPort(e.target.value)} />
            </Field>
            <Field label="protocol">
              <Select value={protocol} onChange={e => setProtocol(e.target.value)}>
                {['TCP', 'HTTP', 'HTTP2', 'gRPC'].map(p => <option key={p}>{p}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="env" hint="KEY=VALUE — press Enter to add">
            <TagInput value={envVars} onChange={setEnvVars} placeholder="NODE_ENV=production" />
          </Field>

          {error && <p className="form-submit-error">{error}</p>}
          <YamlPreview value={{ apiVersion: 'environments.blanketops.dev/v1alpha1', kind: 'ServiceUnit', metadata: { name, namespace }, spec }} />
          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'creating…' : 'create'}</button>
            <button type="button" className="btn" onClick={() => nav('/serviceunits')}>cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
