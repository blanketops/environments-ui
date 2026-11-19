import { useState, useEffect, useRef, type FC } from 'react'
import type { CRStatus, CREvent } from '../types'
import { toYaml } from './YamlBlock'
import { ConfirmDialog } from './ConfirmDialog'
import { ObjectMap } from './ObjectMap'
import { KIND_GROUP, KIND_SINGULAR, phaseClass } from '../types'
import type { Kind } from '../types'

// This API returns item.kind as the lowercase plural route key ('environments',
// 'builds') — which is exactly the `Kind` union keyed in KIND_GROUP/KIND_SINGULAR.
// A live K8s backend may instead send PascalCase singular ('Environment'); map that.
const SINGULAR_TO_ROUTE: Record<string, string> = {
  Environment:   'environments',
  Build:         'builds',
  Package:       'packages',
  ServiceUnit:   'serviceunits',
  Deployment:    'deployments',
  GitRepository: 'gitrepositories',
  GitHubEvent:   'githubevents',
  GitHubWebhook: 'githubwebhooks',
  Route:         'routes',
  Domain:        'domains',
  SupplyChain:   'supplychains',
}

const routeKeyFor = (kind: string) =>
  kind in KIND_GROUP ? kind : (SINGULAR_TO_ROUTE[kind] ?? kind)

// Events are only populated by the dedicated /events endpoint, never by the
// list response — so a selected row's item.events is always empty. Format the
// timestamp compactly for the events tab meta line.
function fmtEventTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleString()
}

interface Props {
  item:        CRStatus | null
  onClose:     () => void
  onDelete?:   (name: string) => void | Promise<void>
  onPatched?:  () => void          // let the parent list refetch after a patch
  onSelectItem?: (item: CRStatus) => void // select a related item from the map
}

const BASE_TABS = ['spec', 'yaml', 'conditions', 'events', 'map'] as const
type Tab = typeof BASE_TABS[number] | 'edit'

const TAB_ICONS: Record<Tab, string> = {
  spec:       'ti-list',
  yaml:       'ti-code',
  conditions: 'ti-checks',
  events:     'ti-bell',
  map:        'ti-sitemap',
  edit:       'ti-edit',
}

function flattenSpec(spec: unknown, prefix = ''): [string, string][] {
  if (!spec || typeof spec !== 'object') return []
  return Object.entries(spec as Record<string, unknown>).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k
    if (Array.isArray(v)) {
      // Array of objects → recurse with indexed keys so nested fields render
      // (e.g. policy.allowedTriggers.0.type) instead of "[object Object]".
      const hasObject = v.some(x => x !== null && typeof x === 'object')
      if (!hasObject) return [[key, v.join(', ') || '—']] as [string, string][]
      return v.flatMap((item, i) =>
        item !== null && typeof item === 'object'
          ? flattenSpec(item, `${key}.${i}`)
          : [[`${key}.${i}`, String(item ?? '—')]] as [string, string][],
      )
    }
    if (v !== null && typeof v === 'object') {
      return flattenSpec(v, key)
    }
    return [[key, String(v ?? '—')]] as [string, string][]
  })
}

const specJson = (spec: unknown) => JSON.stringify(spec ?? {}, null, 2)

export const DetailDrawer: FC<Props> = ({ item, onDelete, onPatched, onSelectItem }) => {
  const [tab,           setTab]     = useState<Tab>('spec')
  const [copied,        setCopied]  = useState(false)
  const [confirmDelete, setConfirm] = useState(false)
  const [deleting,      setDeleting] = useState(false)
  const [collapsed,     setCollapsed] = useState(false)

  // Local view of the resource. Seeded from the prop, refreshed in place
  // after a successful patch so the drawer always shows the latest server state.
  const [view, setView] = useState<CRStatus | null>(item)
  const prevName = useRef<string | null>(item?.name ?? null)

  // Edit (patch) tab state
  const [draft,   setDraft]   = useState('')
  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  // Events for the selected item. The list/row item.events is always empty;
  // only the /events endpoint returns them, so fetch on selection change.
  const [events, setEvents] = useState<CREvent[]>([])

  // When a different item is selected, sync the view and reset per-item UI
  // state. Collapse is intentionally NOT reset — the user controls it.
  useEffect(() => {
    if (item?.name !== prevName.current) {
      setView(item)
      prevName.current = item?.name ?? null
      setTab('spec')
      setConfirm(false)
      setSaveErr(null)
      setSaved(false)
    }
  }, [item?.name, item])

  useEffect(() => {
    if (!item) { setEvents([]); return }
    let cancelled = false
    const rk = routeKeyFor(item.kind)
    import('../api/client')
      .then(({ getEvents }) => getEvents(rk, item.namespace, item.name))
      .then(ev => { if (!cancelled) setEvents(ev) })
      .catch(() => { if (!cancelled) setEvents([]) })
    return () => { cancelled = true }
  }, [item?.name, item?.namespace, item?.kind])

  if (!item) return null

  // Prefer the freshest of (patched view, incoming prop) for the same item.
  const v = view && view.name === item.name ? view : item

  const specFields = flattenSpec(v.spec)
  const phasePc    = phaseClass(v.phase)
  const phaseLower = phasePc.toLowerCase()
  const isActive   = phasePc === 'Running' || phasePc === 'Failed'

  const routeKey = routeKeyFor(v.kind)
  const kindKey  = routeKey               // valid Kind for group/singular lookups
  const canPatch = routeKey in KIND_GROUP // every known kind supports spec patch

  const TABS: Tab[] = canPatch ? [...BASE_TABS, 'edit'] : [...BASE_TABS]

  const yamlObj = {
    apiVersion: KIND_GROUP[kindKey as Kind]    ?? 'environments.blanketops.dev/v1alpha1',
    kind:       KIND_SINGULAR[kindKey as Kind] ?? v.kind,
    metadata:   { name: v.name, namespace: v.namespace, labels: v.labels },
    spec:       v.spec,
    status:     { phase: v.phase, conditions: v.conditions },
  }
  const yamlStr = toYaml(yamlObj).trim()

  const copyYaml = () =>
    navigator.clipboard.writeText(yamlStr).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })

  const openEdit = () => {
    setDraft(specJson(v.spec))
    setSaveErr(null)
    setSaved(false)
    setTab('edit')
  }

  const selectTab = (t: Tab) => (t === 'edit' ? openEdit() : setTab(t))

  const handleSave = async () => {
    if (!routeKey) return
    let parsed: unknown
    try {
      parsed = JSON.parse(draft)
    } catch (e) {
      setSaveErr(`Invalid JSON — ${(e as Error).message}`)
      return
    }
    setSaving(true)
    setSaveErr(null)
    setSaved(false)
    try {
      const { patchResource, getResource } = await import('../api/client')
      await patchResource(routeKey, v.namespace, v.name, { spec: parsed })
      const fresh = await getResource(routeKey, v.namespace, v.name)
      setView(fresh)
      setDraft(specJson(fresh.spec))
      setSaved(true)
      onPatched?.()
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setSaveErr((e as Error).message ?? String(e))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsed(c => !c)
  }

  const panelClass = `detail-panel${collapsed ? ' collapsed' : ' open'}`

  return (
    <div className={panelClass}>
      {/* Header — always visible */}
      <div className="detail-hdr" onClick={handleToggleCollapse}>
        <div className="detail-hdr-left">
          <span className="detail-name">{v.name}</span>
          <span className={`badge badge-${phaseLower}`}>{phaseLower}</span>
          <i className={`ti ti-chevron-down collapse-toggle${collapsed ? ' rotated' : ''}`} />
        </div>
        <button type="button" className="btn" aria-label="Collapse" onClick={(e) => { e.stopPropagation(); handleToggleCollapse(e) }}>
          <i className={`ti ti-chevron-down collapse-toggle${collapsed ? ' rotated' : ''}`} />
        </button>
      </div>

      {/* Collapsible content */}
      <div className="detail-content" style={{ display: collapsed ? 'none' : 'flex' }}>
        {/* Tabs */}
        <div className="detail-tabs">
          {TABS.map(t => (
            <div
              key={t}
              className={`dtab${tab === t ? ' active' : ''}`}
              onClick={() => selectTab(t)}
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
              <div className="field-row"><div className="fk">name</div><div className="fv">{v.name}</div></div>
              <div className="field-row"><div className="fk">namespace</div><div className="fv">{v.namespace}</div></div>
              <div className="field-row"><div className="fk">generation</div><div className="fv">{v.generation}</div></div>

              {specFields.length > 0 && <div className="sec-title">SPEC</div>}
              {specFields.map(([k, val]) => (
                <div key={k} className="field-row">
                  <div className="fk">{k}</div>
                  <div className="fv">{val}</div>
                </div>
              ))}

              {v.labels && Object.keys(v.labels).length > 0 && (
                <>
                  <div className="sec-title">LABELS</div>
                  {Object.entries(v.labels).map(([k, val]) => (
                    <div key={k} className="field-row">
                      <div className="fk">{k}</div>
                      <div className="fv">{val}</div>
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
            v.conditions.length === 0
              ? <div className="empty-state">no conditions reported</div>
              : v.conditions.map((c, i) => {
                  const falseDot = phaseLower === 'failed'  ? 'dot-failed'
                                 : phaseLower === 'running' ? 'dot-running'
                                 : phaseLower === 'pending' ? 'dot-pending'
                                 : 'dot-failed'
                  return (
                    <div key={i} className="cond-row">
                      <div className={`cond-dot ${c.status === 'True' ? 'dot-ready' : falseDot}`} />
                      <div>
                        <div className="cond-type">{c.type}</div>
                        <div className="cond-msg">{c.message}</div>
                      </div>
                    </div>
                  )
                })
          )}

          {tab === 'events' && (
            events.length === 0
              ? <div className="empty-state">no events reported</div>
              : [...events].reverse().map((e, i) => {
                  const when = fmtEventTime(e.lastTime || e.firstTime)
                  return (
                    <div key={i} className="event-row">
                      <div className={`event-dot ${e.type === 'Warning' ? 'dot-failed' : 'dot-ready'}`} />
                      <div>
                        <div className="event-type">{e.reason}</div>
                        <div className="event-msg">{e.message}</div>
                        <div className="event-meta">{e.count > 1 ? `${e.count}× · ` : ''}{when}</div>
                      </div>
                    </div>
                  )
                })
          )}

          {tab === 'map' && (
            <ObjectMap item={v} onSelectItem={onSelectItem} />
          )}

          {tab === 'edit' && canPatch && (
            <div className="patch-edit">
              <div className="sec-title">PATCH SPEC</div>
              <p className="patch-hint">
                Edit <code>spec</code> as JSON, then save to PATCH <code>{routeKey}/{v.namespace}/{v.name}</code>.
              </p>
              <textarea
                className="patch-editor"
                spellCheck={false}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setSaveErr(null); setSaved(false) }}
              />
              {saveErr && (
                <div className="patch-msg patch-msg--err">
                  <i className="ti ti-alert-circle" />{saveErr}
                </div>
              )}
              {saved && !saveErr && (
                <div className="patch-msg patch-msg--ok">
                  <i className="ti ti-check" />patched — generation {v.generation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="detail-actions">
          {tab === 'edit' && canPatch && (
            <>
              <button type="button" className="btn btn-primary detail-action-btn" onClick={handleSave} disabled={saving}>
                <i className={`ti ${saving ? 'ti-loader-2 spin' : 'ti-device-floppy'}`} />
                {saving ? 'saving…' : 'save patch'}
              </button>
              <button type="button" className="btn" onClick={() => setDraft(specJson(v.spec))} disabled={saving}>
                <i className="ti ti-restore" />reset
              </button>
            </>
          )}

          {tab !== 'edit' && isActive && (
            <button type="button" className="btn detail-action-btn" onClick={() => alert(`debug: ${v.name}`)}>
              <i className="ti ti-alert-triangle" />debug
            </button>
          )}

          {tab !== 'edit' && onDelete && !confirmDelete && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>
              <i className="ti ti-trash" />delete
            </button>
          )}

          {tab !== 'edit' && onDelete && (
            <ConfirmDialog
              open={confirmDelete}
              busy={deleting}
              title={`Delete ${KIND_SINGULAR[routeKey as Kind] ?? v.kind}?`}
              message={`This permanently deletes "${v.name}". This action cannot be undone.`}
              confirmLabel="delete"
              busyMessage="deleting…"
              onConfirm={() => {
                setDeleting(true)
                Promise.resolve(onDelete(v.name)).finally(() => {
                  setDeleting(false)
                  setConfirm(false)
                })
              }}
              onCancel={() => setConfirm(false)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
