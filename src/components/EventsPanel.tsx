import type { FC } from 'react'
import type { CREvent } from '../types'

interface Props { events: CREvent[] }

export const EventsPanel: FC<Props> = ({ events }) => {
  if (!events.length)
    return <p className="text-sm text-zinc-500 py-4">No events emitted.</p>

  return (
    <div className="divide-y divide-zinc-800">
      {events.map((ev, i) => (
        <div key={i} className="py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono border rounded px-1.5 py-0.5 ${ev.type === 'Warning' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-lime-400 bg-lime-400/10 border-lime-400/20'}`}>
              {ev.type}
            </span>
            <span className="text-xs font-semibold text-zinc-200">{ev.reason}</span>
            <span className="text-[10px] text-zinc-500 ml-auto">×{ev.count}</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{ev.message}</p>
          <p className="text-[10px] text-zinc-600 mt-1 font-mono">{ev.lastTime}</p>
        </div>
      ))}
    </div>
  )
}
