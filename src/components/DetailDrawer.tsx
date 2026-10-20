import { useState, type FC } from 'react'
import type { CRStatus } from '../types'
import { toYaml } from './YamlBlock'
import { KIND_GROUP, KIND_SINGULAR } from '../types'
import type { Kind } from '../types'

interface Props {
  item: CRStatus | null
  onClose: () => void
  onDelete?: (name: string) => void
}

const TABS = ['spec', 'yaml', 'conditions'] as const
type Tab = typeof TABS[number]

const TAB_ICONS: Record<Tab, string> = {
  spec:       'ti-list',
  yaml:       'ti-code',
  conditions: 'ti-checks',
}

function flattenSpec(spec: unknown, prefix = ''): [string, string][] {
  if (!spec || typeof spec !== 'object') return []
  return Object.entries(spec as Record<string, unknown>).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      return flattenSpec(v, key)
    }
    return [[key, Array.isArray(v) ? (v as unknown[]).join(', ') : String(v ?? '—')]] as [string, string][]
  })
}

export const DetailDrawer: FC<Props> = ({ item, onClose, onDelete }) => {
  const [tab, setTab]               = useState<Tab>('spec')
  const [copied, setCopied]         = useState(false)
  const [confirmDelete, setConfirm] = useState(false)

  if (!item) return null

  const specFields = flattenSpec(item.spec)
  const yamlObj = {
    apiVersion: KIND_GROUP[item.kind as Kind] ?? 'environments.blanketops.dev/v1alpha1',
    kind:       KIND_SINGULAR[item.kind as Kind] ?? item.kind,
    metadata:   { name: item.name, namespace: item.namespace, labels: item.labels },
    spec:       item.spec,
    status:     { phase: item.phase, conditions: item.conditions },
  }
  const yamlStr   = toYaml(yamlObj).trim()
  const phaseLower = item.phase.toLowerCase()
  const isActive   = item.phase === 'Running' || item.phase === 'Failed'

  const copyYaml = () =>
    navigator.clipboard.writeText(yamlStr).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })

  return (
    <div className="detail-panel open">
      {/* Header */}
      <div className="detail-hdr">
        <div className="detail-hdr-left">
          <span className="detail-name">{item.name}</span>
          <span className={`badge badge-${phaseLower}`}>{phaseLower}</span>
        </div>
        <button type="button" className="btn" aria-label="Close" onClick={() => { onClose(); setConfirm(false) }}>
          <i className="ti ti-x" />
        </button>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        {TABS.map(t => (
          <div
            key={t}
            className={`dtab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            <i className={`ti ${TAB_ICONS[t]}`} />{t}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="detail-body">
        {tab === 'spec' && (
          <>
            <div className="sec-title">METADATA</div>
            <div className="field-row"><div className="fk">name</div><div className="fv">{item.name}</div></div>
            <div className="field-row"><div className="fk">namespace</div><div className="fv">{item.namespace}</div></div>
            <div className="field-row"><div className="fk">generation</div><div className="fv">{item.generation}</div></div>

            {specFields.length > 0 && <div className="sec-title">SPEC</div>}
            {specFields.map(([k, v]) => (
              <div key={k} className="field-row">
                <div className="fk">{k}</div>
                <div className="fv">{v}</div>
              </div>
            ))}

            {item.labels && Object.keys(item.labels).length > 0 && (
              <>
                <div className="sec-title">LABELS</div>
                {Object.entries(item.labels).map(([k, v]) => (
                  <div key={k} className="field-row">
                    <div className="fk">{k}</div>
                    <div className="fv">{v}</div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {tab === 'yaml' && (
          <>
            <div className="copy-btn">
              <button type="button" className="btn" onClick={copyYaml}>
                <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
                {copied ? 'copied' : 'copy'}
              </button>
            </div>
            <pre className="yaml-block">{yamlStr}</pre>
          </>
        )}

        {tab === 'conditions' && (
          item.conditions.length === 0
            ? <div className="empty-state">no conditions reported</div>
            : item.conditions.map((c, i) => {
              const falseDotCls = phaseLower === 'failed'  ? 'dot-failed'
                                : phaseLower === 'running' ? 'dot-running'
                                : phaseLower === 'pending' ? 'dot-pending'
                                : 'dot-failed'
              return (
              <div key={i} className="cond-row">
                <div className={`cond-dot ${c.status === 'True' ? 'dot-ready' : falseDotCls}`} />
                <div>
                  <div className="cond-type">{c.type}</div>
                  <div className="cond-msg">{c.message}</div>
                </div>
              </div>
              )})
        )}
      </div>

      {/* Footer actions */}
      <div className="detail-actions">
        <button type="button" className="btn detail-action-btn" onClick={() => alert(`patch: ${item.name}`)}>
          <i className="ti ti-edit" />patch
        </button>
        {isActive && (
          <button type="button" className="btn detail-action-btn" onClick={() => alert(`debug: ${item.name}`)}>
            <i className="ti ti-alert-triangle" />debug
          </button>
        )}
        {onDelete && !confirmDelete && (
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
            <i className="ti ti-trash" />delete
          </button>
        )}
        {onDelete && confirmDelete && (
          <>
            <button type="button" className="btn btn-danger" onClick={() => { onDelete(item.name); setConfirm(false) }}>
              confirm
            </button>
            <button type="button" className="btn" onClick={() => setConfirm(false)}>cancel</button>
          </>
        )}
      </div>
    </div>
  )
}
