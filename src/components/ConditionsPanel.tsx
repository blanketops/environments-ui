import type { FC } from 'react'
import type { Condition } from '../types'

interface Props { conditions: Condition[] }

const TONE: Record<string, string> = {
  True:  'status-pill--ok',
  False: 'status-pill--bad',
}

export const ConditionsPanel: FC<Props> = ({ conditions }) => {
  if (!conditions.length)
    return <p className="panel-empty">No conditions reported.</p>

  return (
    <div className="stack">
      {conditions.map((c, i) => (
        <div key={i} className="info-card">
          <div className="info-card-hdr">
            <span className={`status-pill ${TONE[c.status] ?? ''}`}>{c.status}</span>
            <span className="info-card-title">{c.type}</span>
            <span className="info-card-meta">{c.reason}</span>
          </div>
          <p className="info-card-msg">{c.message}</p>
          <p className="info-card-time">{c.lastTransitionTime}</p>
        </div>
      ))}
    </div>
  )
}
