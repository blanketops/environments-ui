import { useEffect, useRef, useState, type FC } from 'react'
import { useSkin } from '../skins/SkinContext'

/** Header control: pick a skin from a small menu. */
export const SkinMenu: FC = () => {
  const { skin, skins, setSkin } = useSkin()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="skin-menu" ref={ref}>
      <button
        type="button"
        className="topbar-btn topbar-btn--wide"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <i className="ti ti-palette" />
        <span>{skin.label}</span>
        <i className="ti ti-chevron-down" />
      </button>
      {open && (
        <div className="skin-menu-list" role="menu">
          {skins.map(s => (
            <button
              key={s.id}
              type="button"
              role="menuitemradio"
              aria-checked={s.id === skin.id}
              className={`skin-menu-item${s.id === skin.id ? ' skin-menu-item--on' : ''}`}
              onClick={() => { setSkin(s.id); setOpen(false) }}
            >
              <span className="skin-menu-label">{s.label}</span>
              <span className="skin-menu-desc">{s.description}</span>
              {s.id === skin.id && <i className="ti ti-check skin-menu-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Header control: switch between light and dark within the active skin. */
export const ModeToggle: FC = () => {
  const { mode, toggleMode, canToggleMode, skin } = useSkin()
  const next = mode === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      className="topbar-btn topbar-btn--round"
      onClick={toggleMode}
      disabled={!canToggleMode}
      aria-label={canToggleMode ? `Switch to ${next} mode` : `${skin.label} has only a ${mode} mode`}
      title={canToggleMode ? `Switch to ${next} mode` : `${skin.label} has only a ${mode} mode`}
    >
      <i className={`ti ${mode === 'dark' ? 'ti-sun' : 'ti-moon'}`} />
    </button>
  )
}
