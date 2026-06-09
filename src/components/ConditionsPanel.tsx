import type { FC } from 'react'
import type { Condition } from '../types'

interface Props { conditions: Condition[] }

const statusCls: Record<string, string> = {
  True:    'text-lime-400 bg-lime-400/10 border-lime-400/20',
  False:   'text-red-400  bg-red-400/10  border-red-400/20',
  Unknown: 'text-zinc-400 bg-zinc-700/20 border-zinc-700/30',
}

export const ConditionsPanel: FC<Props> = ({ conditions }) => {
  if (!conditions.length)
    return <p className="text-sm text-zinc-500 py-4">No conditions reported.</p>

  return (
    <div className="space-y-3">
      {conditions.map((c, i) => (
        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-[10px] font-mono border rounded-full px-2 py-0.5 ${statusCls[c.status] ?? statusCls.Unknown}`}>
              {c.status}
            </span>
            <span className="text-sm font-semibold text-zinc-200">{c.type}</span>
            <span className="text-[10px] text-zinc-500 ml-auto font-mono">{c.reason}</span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{c.message}</p>
          <p className="text-[10px] text-zinc-600 mt-2 font-mono">{c.lastTransitionTime}</p>
        </div>
      ))}
    </div>
  )
}
