import type { FC } from 'react'

interface Props {
  value: boolean
  onChange: (v: boolean) => void
  label: string
  sub?: string
}

export const ToggleField: FC<Props> = ({ value, onChange, label, sub }) => (
  <div className="toggle-row">
    <button type="button" onClick={() => onChange(!value)}
      className={`toggle-btn ${value ? 'toggle-btn-on' : 'toggle-btn-off'}`}>
      <span className={`toggle-knob ${value ? 'toggle-knob-on' : 'toggle-knob-off'}`} />
    </button>
    <div>
      <div className="toggle-label-text">{label}</div>
      {sub && <div className="toggle-sub-text">{sub}</div>}
    </div>
  </div>
)
