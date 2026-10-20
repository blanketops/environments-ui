import type { FC } from 'react'

export interface IconOption {
  value: string
  icon: string
  label: string
  sub: string
}

interface Props {
  options: IconOption[]
  value: string
  onChange: (value: string) => void
  cols?: 2 | 3
}

export const IconSelector: FC<Props> = ({ options, value, onChange, cols = 2 }) => (
  <div className={`opt-grid opt-grid-${cols}`}>
    {options.map(opt => (
      <button key={opt.value} type="button" onClick={() => onChange(opt.value)}
        className={`opt-btn${value === opt.value ? ' opt-selected' : ''}`}>
        <i className={`ti ${opt.icon} opt-btn-icon`} />
        <span className="opt-btn-label">{opt.label}</span>
        <span className="opt-btn-sub">{opt.sub}</span>
      </button>
    ))}
  </div>
)
