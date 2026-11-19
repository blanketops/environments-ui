import { useState, useEffect, type FC } from 'react'
import { list } from '../api/client'
import type { CRStatus } from '../types'
import { KIND_LABELS, phaseClass } from '../types'

// Kinds that can be composed under an Environment, in graph-display order.
const RELATED_KINDS = [
  'builds',
  'deployments',
  'packages',
  'serviceunits',
  'gitrepositories',
  'routes',
  'domains',
] as const

interface Props {
  item: CRStatus
  onSelectItem?: (item: CRStatus) => void
}

/**
 * ObjectMap — Octant-style object relationship graph.
 *
 * Shows the selected item at the center and all CRs that reference it
 * (via the `environments.blanketops.dev/name` label) as satellite nodes.
 * Clicking a satellite re-selects that item.
 */
export const ObjectMap: FC<Props> = ({ item, onSelectItem }) => {
  const [related, setRelated] = useState<Map<string, CRStatus[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The environment name this item belongs to (or the item itself if it's an env).
  const envName =
    item.labels?.['environments.blanketops.dev/name'] ?? item.name

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all(
      RELATED_KINDS.map((kind) =>
        list(kind).then((res) => {
          const items = (res.items ?? []).filter(
            (i) => i.labels?.['environments.blanketops.dev/name'] === envName
          )
          return { kind, items }
        }),
      ),
    )
      .then((results) => {
        if (cancelled) return
        const map = new Map<string, CRStatus[]>()
        results.forEach(({ kind, items }) => {
          if (items.length > 0) {
            map.set(kind, items)
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
  }, [envName])

  if (error) {
    return (
      <div className="om-empty">
        <i className="ti ti-alert-circle" /> Failed to load relationships: {error}
      </div>
    )
  }

  const entries = Array.from(related.entries())
  const total = entries.reduce((sum, [, items]) => sum + items.length, 0)

  if (loading || total === 0) {
    return (
      <div className="om-empty">
        <i className="ti ti-layout" /> No related resources found
      </div>
    )
  }

  const centerKind = item.kind.charAt(0).toUpperCase() + item.kind.slice(1)

  return (
    <div className="om-wrap">
      <div className="om-header">
        <span className="om-title">Object Map</span>
        <span className="om-sub">
          {total} related resource{total !== 1 ? 's' : ''} ·
          <span className="om-phase">{envName}</span>
        </span>
      </div>

      <div className="om-canvas">
        {/* Connecting lines drawn as SVG */}
        <svg className="om-svg" aria-hidden="true">
          {entries.flatMap(([kind, items]) =>
            items
              .filter(
                (_item) =>
                  !(kind === 'environments' && _item.name === item.name),
              )
              .map((_item, i) => (
                <line
                  key={kind + i}
                  className="om-line"
                  x1="50%"
                  y1="50%"
                  x2={
                    50 +
                    130 * Math.cos((i * 2 * Math.PI) / items.length)
                  }
                  y2={
                    50 +
                    130 * Math.sin((i * 2 * Math.PI) / items.length)
                  }
                />
              )),
          )}
        </svg>

        {/* Center node */}
        <div
          className={`om-node om-node--center ${phaseClass(item.phase).toLowerCase()}`}
          onClick={() => {}}
          title={`${centerKind} · ${item.name}`}
        >
          <div className="om-node-dot" />
          <div className="om-node-label">{item.name}</div>
          <div className="om-node-kind">{centerKind}</div>
        </div>

        {/* Satellite nodes */}
        {entries.map(([kind, items]) =>
          items.map((it, i) => {
            const isSelf =
              kind === 'environments' && it.name === item.name
            const angle = (i * 2 * Math.PI) / items.length
            const x = 50 + 130 * Math.cos(angle)
            const y = 50 + 130 * Math.sin(angle)
            const phase = phaseClass(it.phase)
            const kindLabel = KIND_LABELS[kind as keyof typeof KIND_LABELS] ?? kind

            if (isSelf) return null

            return (
              <div
                key={kind + '/' + it.name}
                className={`om-node om-node--sat ${phase.toLowerCase()}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                }}
                onClick={() => {
                  onSelectItem?.(it)
                }}
                title={`${kindLabel} · ${it.name} · ${phase}`}
              >
                <div className="om-node-dot" />
                <div className="om-node-label">{it.name}</div>
                <div className="om-node-kind">{kindLabel}</div>
                <div className="om-node-badge">{phase}</div>
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
