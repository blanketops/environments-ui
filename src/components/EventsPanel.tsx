import type { FC } from 'react'
import type { CREvent } from '../types'

interface Props { events: CREvent[] }

export const EventsPanel: FC<Props> = ({ events }) => {
  if (!events.length)
    return <p className="panel-empty">No events emitted.</p>

  return (
    <div className="stack">
      {events.map((ev, i) => (
        <div key={i} className="info-card">
          <div className="info-card-hdr">
            <span className={`status-pill ${ev.type === 'Warning' ? 'status-pill--bad' : 'status-pill--ok'}`}>{ev.type}</span>
            <span className="info-card-title">{ev.reason}</span>
            <span className="info-card-meta">×{ev.count}</span>
          </div>
          <p className="info-card-msg">{ev.message}</p>
          <p className="info-card-time">{ev.lastTime}</p>
        </div>
      ))}
    </div>
  )
}
