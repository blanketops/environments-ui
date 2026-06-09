import type { FC } from 'react'
import { Link } from 'react-router-dom'
import type { CRStatus } from '../types'

function computeAge(item: CRStatus): string {
  const t = item.conditions[0]?.lastTransitionTime
  if (!t) return '—'
  const diff = Date.now() - new Date(t).getTime()
  if (diff < 60_000)      return `${Math.floor(diff / 1000)}s`
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / 86_400_000)}d`
}

export type SubVariant = 'text' | 'tag' | 'tag-amber' | 'tag-purple' | 'tag-green'

export interface SubItem {
  value: string
  variant?: SubVariant
}

interface Props {
  title: string
  items: CRStatus[]
  loading?: boolean
  error?: string | null
  createPath?: string
  selected: CRStatus | null
  onSelect: (item: CRStatus) => void
  getSubItems?: (item: CRStatus) => SubItem[]
}

function TagEl({ item }: { item: SubItem }) {
  if (!item.variant || item.variant === 'text') {
    return <span className="row-sub-item">{item.value}</span>
  }
  const cls = item.variant === 'tag' ? 'tag tag-blue' : `tag tag-${item.variant.replace('tag-', '')}`
  return <span className={cls}>{item.value}</span>
}

export const ResourceList: FC<Props> = ({
  title, items, loading, error, createPath, selected, onSelect, getSubItems,
}) => {
  if (loading) return <div className="empty-state">loading {title}s…</div>
  if (error)   return <div className="empty-state" style={{ color: 'var(--red)' }}>Error: {error}</div>

  const phaseLower = (phase: string) => phase.toLowerCase()

  return (
    <div className="card">
      <div className="card-hdr">
        <span className="card-title">{title}s</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="total-badge">{items.length} total</span>
          {createPath && (
            <Link to={createPath} className="btn btn-primary">
              <i className="ti ti-plus" />create
            </Link>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          no {title} CRs yet
          {createPath && <> — <Link to={createPath} style={{ color: 'var(--blue)' }}>create one</Link></>}
        </div>
      ) : (
        items.map(item => {
          const isSel = selected?.name === item.name
          const sub   = getSubItems?.(item) ?? []
          const phase = phaseLower(item.phase)
          return (
            <div
              key={item.name}
              className={`list-row${isSel ? ' selected' : ''}`}
              onClick={() => onSelect(item)}
            >
              <span className={`dot dot-${phase}`} />
              <div className="row-main">
                <div className="row-name">{item.name}</div>
                {sub.length > 0 && (
                  <div className="row-sub">
                    {sub.map((s, idx) => <TagEl key={idx} item={s} />)}
                  </div>
                )}
              </div>
              <span className="row-age">{computeAge(item)}</span>
              <span className={`badge badge-${phase}`}>{phase}</span>
              <i className="ti ti-chevron-right" style={{ color: 'var(--text3)', fontSize: 13 }} />
            </div>
          )
        })
      )}
    </div>
  )
}
