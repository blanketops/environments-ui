import type { FC } from 'react'

interface Props { phase: string; size?: 'sm' | 'md' }

const MAP: Record<string, string> = {
  Ready:   'bg-lime-400/10 text-lime-400 border-lime-400/20',
  Pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Failed:  'bg-red-500/10  text-red-400  border-red-500/20',
}

export const PhaseBadge: FC<Props> = ({ phase, size = 'md' }) => {
  const cls = MAP[phase] ?? 'bg-zinc-700/30 text-zinc-400 border-zinc-700/30'
  const dot: Record<string, string> = {
    Ready: 'bg-lime-400', Pending: 'bg-amber-400', Failed: 'bg-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full font-mono ${size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} ${cls}`}>
      <span className={`rounded-full flex-shrink-0 ${size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5'} ${dot[phase] ?? 'bg-zinc-400'}`} />
      {phase}
    </span>
  )
}
