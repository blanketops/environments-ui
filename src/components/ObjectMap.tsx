import { useState, useEffect, type FC } from 'react'
import { list } from '../api/client'
import type { CRStatus } from '../types'
import { KIND_LABELS, phaseClass } from '../types'

// ── Relationship definitions ──────────────────────────────────────────
// Each edge kind defines how a center item relates to its satellites,
// with a verb for the edge label, a short badge, an edge color, and the
// label key used to correlate satellites to the center item.
interface RelationshipDef {
  kind: string
  label: string      // full verb shown in edge label
  short: string      // short badge on edge
  color: string      // CSS var for edge color
  labelKey: string   // label key on satellites that points back to center
  labelValue: (item: CRStatus) => string  // extract the center's name from an item
}

// Environment → composed CRs (label: environments.blanketops.dev/name)
const ENV_RELATIONSHIPS: RelationshipDef[] = [
  { kind: 'builds',        label: 'builds',        short: 'build', color: 'var(--blue)',   labelKey: 'environments.blanketops.dev/name', labelValue: (i) => i.labels?.['environments.blanketops.dev/name'] ?? '' },
  { kind: 'deployments',   label: 'deploys to',    short: 'deploy',color: 'var(--green)',  labelKey: 'environments.blanketops.dev/name', labelValue: (i) => i.labels?.['environments.blanketops.dev/name'] ?? '' },
  { kind: 'packages',      label: 'installs',      short: 'pkg',   color: 'var(--purple)', labelKey: 'environments.blanketops.dev/name', labelValue: (i) => i.labels?.['environments.blanketops.dev/name'] ?? '' },
  { kind: 'serviceunits',  label: 'runs',          short: 'svc',   color: 'var(--amber)',  labelKey: 'environments.blanketops.dev/name', labelValue: (i) => i.labels?.['environments.blanketops.dev/name'] ?? '' },
  { kind: 'gitrepositories',label: 'sources from', short: 'git',   color: 'var(--text2)',  labelKey: 'environments.blanketops.dev/name', labelValue: (i) => i.labels?.['environments.blanketops.dev/name'] ?? '' },
  { kind: 'routes',        label: 'exposes via',   short: 'route', color: 'var(--cyan)',   labelKey: 'environments.blanketops.dev/name', labelValue: (i) => i.labels?.['environments.blanketops.dev/name'] ?? '' },
  { kind: 'domains',       label: 'hosts at',      short: 'dom',   color: 'var(--pink)',   labelKey: 'environments.blanketops.dev/name', labelValue: (i) => i.labels?.['environments.blanketops.dev/name'] ?? '' },
]

// Build → BuildRun (Shipwright; label: build.blanketops.dev/name)
const BUILD_RELATIONSHIPS: RelationshipDef[] = [
  { kind: 'buildruns',     label: 'runs',          short: 'run',   color: 'var(--red)',    labelKey: 'build.blanketops.dev/name', labelValue: (i) => i.name },
]

const KIND_RELATIONSHIPS: Record<string, RelationshipDef[]> = {
  environments: ENV_RELATIONSHIPS,
  builds:       BUILD_RELATIONSHIPS,
}

interface Props {
  item: CRStatus
  onSelectItem?: (item: CRStatus) => void
}

/**
 * ObjectMap — Octant-style object relationship graph.
 *
 * Shows the selected item at the center and all related CRs as satellites,
 * connected by labeled edges that describe the relationship type
 * (builds, deploys to, runs, exposes via, hosts at, …).
 *
 * Two levels of depth:
 *   Level 1 — center item → its direct relationships (Environment → Build,
 *             Build → BuildRun, etc.)
 *   Level 2 — parent Environment navigation: non-Environment items show
 *             their parent env as a top node
 *
 * Clicking any node re-selects that item.
 */
export const ObjectMap: FC<Props> = ({ item, onSelectItem }) => {
  const [related, setRelated] = useState<Map<string, CRStatus[]>>(new Map())
  const [parentEnv, setParentEnv] = useState<CRStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The environment name this item belongs to (or the item itself if it's an env).
  const envName =
    item.labels?.['environments.blanketops.dev/name'] ?? item.name
  const isEnvironment = item.kind === 'environments'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const defs = KIND_RELATIONSHIPS[item.kind] ?? []

    const queries: Promise<{ kind: string; items: CRStatus[] }>[] = defs.map(
      (def) =>
        list(def.kind)
          .then((res) => {
            // Correlate satellites to center via the relationship's label key.
            const items = (res.items ?? []).filter((i) => {
              const centerName = def.labelValue(i)
              return centerName !== '' && centerName === envName
            })
            return { kind: def.kind, items }
          })
          // A relationship kind may not be installed yet (e.g. buildruns
          // before the server picks up the new GVK). Skip it gracefully.
          .catch(() => ({ kind: def.kind, items: [] as CRStatus[] })),
    )

    // If this item is not an Environment, also fetch its parent Environment.
    if (!isEnvironment) {
      queries.push(
        list('environments').then((res) => {
          const parents = (res.items ?? []).filter(
            (i) => i.name === envName
          )
          return { kind: 'environments', items: parents }
        }),
      )
    }

    Promise.all(queries)
      .then((results) => {
        if (cancelled) return
        const map = new Map<string, CRStatus[]>()
        results.forEach(({ kind, items }) => {
          // Filter out the center item itself when it appears in its own kind list.
          const filtered = items.filter(
            (i) =>
              !(i.kind === item.kind &&
                i.name === item.name &&
                i.namespace === item.namespace),
          )
          if (filtered.length > 0) {
            map.set(kind, filtered)
          }
          // Capture parent environment separately.
          if (kind === 'environments' && !isEnvironment && filtered.length > 0) {
            setParentEnv(filtered[0])
          }
        })
        setRelated(map)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [envName, isEnvironment, item.kind, item.name, item.namespace])

  if (error) {
    return (
      <div className="om-empty">
        <i className="ti ti-alert-circle" /> Failed to load relationships: {error}
      </div>
    )
  }

  const entries = Array.from(related.entries())
  const total = entries.reduce((sum, [, items]) => sum + items.length, 0)

  if (loading || (total === 0 && !parentEnv)) {
    return (
      <div className="om-empty">
        <i className="ti ti-layout" /> No related resources found
      </div>
    )
  }

  const centerKind = item.kind.charAt(0).toUpperCase() + item.kind.slice(1)

  // ── Layout ──────────────────────────────────────────────────────────
  // Canvas is 1000×1000, center at (500, 500).
  // Relationship groups are arranged in arcs around the center, each group
  // getting its own angular span. Parent env (if any) sits at the top.
  const CENTER_X = 500
  const CENTER_Y = 500
  const RADIUS = 210
  const GAP_DEG = 14 // gap between relationship groups

  // Build ordered list of groups to render.
  // Each group: { kind, label, short, color, items, isParent }
  const groups: Array<{
    kind: string
    label: string
    short: string
    color: string
    items: CRStatus[]
    isParent: boolean
  }> = []

  if (parentEnv) {
    groups.push({
      kind: 'environments',
      label: 'belongs to',
      short: 'env',
      color: 'var(--blue)',
      items: [parentEnv],
      isParent: true,
    })
  }

  entries.forEach(([kind, items]) => {
    const def = ENV_RELATIONSHIPS.find((d) => d.kind === kind) ??
      BUILD_RELATIONSHIPS.find((d) => d.kind === kind)
    if (!def) return
    groups.push({
      kind: def.kind,
      label: def.label,
      short: def.short,
      color: def.color,
      items,
      isParent: false,
    })
  })

  const groupCount = groups.length
  // Total arc = 240° centered on bottom (from 210° to 330°), leaving top free.
  const TOTAL_ARC = 240
  const START_DEG = 210
  const arcPerGroup = groupCount > 0 ? TOTAL_ARC / groupCount : 0

  // Compute node positions.
  // Each entry: { kind, name, x, y, label, short, color, isParent, phase, item }
  const nodes: Array<{
    kind: string
    name: string
    namespace: string
    x: number
    y: number
    label: string
    short: string
    color: string
    isParent: boolean
    phase: string
    item: CRStatus
  }> = []

  let currentDeg = START_DEG
  groups.forEach((group) => {
    const itemCount = group.items.length
    const groupArc = itemCount > 1 ? arcPerGroup - GAP_DEG : arcPerGroup
    const itemArc = itemCount > 0 ? groupArc / itemCount : 0
    const groupStart = currentDeg

    group.items.forEach((it, ii) => {
      const deg = groupStart + (itemCount === 1 ? 0 : ii * itemArc)
      const rad = (deg * Math.PI) / 180
      const phase = phaseClass(it.phase)
      nodes.push({
        kind: group.kind,
        name: it.name,
        namespace: it.namespace,
        x: CENTER_X + RADIUS * Math.cos(rad),
        y: CENTER_Y + RADIUS * Math.sin(rad),
        label: group.label,
        short: group.short,
        color: group.color,
        isParent: group.isParent,
        phase,
        item: it,
      })
    })

    currentDeg = groupStart + arcPerGroup + GAP_DEG
  })

  return (
    <div className="om-wrap">
      <div className="om-header">
        <span className="om-title">Object Map</span>
        <span className="om-sub">
          {nodes.length} related resource{nodes.length !== 1 ? 's' : ''} ·
          <span className="om-phase">{envName}</span>
        </span>
      </div>

      <div className="om-canvas">
        {/* Connecting lines + relationship labels */}
        <svg className="om-svg" aria-hidden="true">
          {nodes.map((n, i) => (
            <g key={`edge-${i}`}>
              <line
                className="om-line"
                style={{ stroke: n.color }}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={n.x}
                y2={n.y}
              />
              {/* Relationship label at midpoint */}
              <text
                key={`label-${i}`}
                className="om-edge-label"
                style={{ fill: n.color }}
                x={(CENTER_X + n.x) / 2}
                y={(CENTER_Y + n.y) / 2 - 6}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-ui)"
                pointerEvents="none"
              >
                {n.short}
              </text>
            </g>
          ))}
        </svg>

        {/* Center node */}
        <div
          className={`om-node om-node--center ${phaseClass(item.phase).toLowerCase()}`}
          style={{
            left: `calc(50% - 85px)`,
            top: `calc(50% - 85px)`,
          }}
          title={`${centerKind} · ${item.name} · ${phaseClass(item.phase)}`}
        >
          <div className="om-node-dot" />
          <div className="om-node-label">{item.name}</div>
          <div className="om-node-kind">{centerKind}</div>
          <div className="om-node-badge">{phaseClass(item.phase)}</div>
        </div>

        {/* Satellite nodes */}
        {nodes.map((n) => {
          const kindLabel =
            KIND_LABELS[n.kind as keyof typeof KIND_LABELS] ?? n.kind
          return (
            <div
              key={`${n.kind}/${n.name}`}
              className={`om-node om-node--sat ${n.phase.toLowerCase()}${
                n.isParent ? ' om-node--parent' : ''
              }}`}
              style={{
                left: `${n.x - 75}px`,
                top: `${n.y - 75}px`,
              }}
              onClick={() => {
                onSelectItem?.(n.item)
              }}
              title={`${kindLabel} · ${n.name} · ${n.phase}`}
            >
              <div className="om-node-dot" />
              <div className="om-node-label">{n.name}</div>
              <div className="om-node-kind">{kindLabel}</div>
              {n.isParent && (
                <div className="om-node-badge om-node-badge--parent">
                  parent env
                </div>
              )}
              {!n.isParent && (
                <div className="om-node-badge">{n.phase}</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
