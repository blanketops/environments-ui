import type { FC } from 'react'

interface Props { phase: string; size?: 'sm' | 'md' }

const TONE: Record<string, string> = {
  Ready:   'status-pill--ok',
  Pending: 'status-pill--warn',
  Failed:  'status-pill--bad',
}

export const PhaseBadge: FC<Props> = ({ phase, size = 'md' }) => (
  <span className={`status-pill ${size === 'md' ? 'status-pill--md' : ''} ${TONE[phase] ?? ''}`}>
    <span className="status-pill-dot" />
    {phase}
  </span>
)
