// Skins: named palettes and shapes for the whole UI. A skin is applied as
// <html data-skin="..."> plus the `dark` class for dark mode; every rule in
// index.css reads the CSS variables those set, so no component knows which
// skin is active.

export type SkinId = 'tailadmin' | 'terminal'
export type Mode = 'light' | 'dark'

export interface Skin {
  id: SkinId
  label: string
  description: string
  /** Modes the skin defines. A single-mode skin ignores the light/dark toggle. */
  modes: readonly Mode[]
}

export const SKINS: readonly Skin[] = [
  {
    id: 'tailadmin',
    label: 'TailAdmin',
    description: 'Outfit, rounded cards, light and dark',
    modes: ['light', 'dark'],
  },
  {
    id: 'terminal',
    label: 'Terminal',
    description: 'IBM Plex Mono, dense, dark only',
    modes: ['dark'],
  },
]

export const DEFAULT_SKIN: SkinId = 'tailadmin'
export const DEFAULT_MODE: Mode = 'light'

export const SKIN_KEY = 'blanketops.skin'
export const MODE_KEY = 'blanketops.mode'

export function getSkin(id: string | null | undefined): Skin {
  return SKINS.find(s => s.id === id) ?? SKINS.find(s => s.id === DEFAULT_SKIN)!
}

/** The mode a skin actually renders in: the requested one if it defines it, else its first. */
export function effectiveMode(skin: Skin, requested: Mode): Mode {
  return skin.modes.includes(requested) ? requested : skin.modes[0]
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Storage can be unavailable (private mode, quota); the choice then lasts
    // for this page only.
  }
}

export function loadPreference(): { skin: SkinId; mode: Mode } {
  const skin = getSkin(read(SKIN_KEY)).id
  const stored = read(MODE_KEY)
  const mode: Mode = stored === 'light' || stored === 'dark' ? stored : DEFAULT_MODE
  return { skin, mode }
}

export function savePreference(skin: SkinId, mode: Mode): void {
  write(SKIN_KEY, skin)
  write(MODE_KEY, mode)
}

export function applySkin(root: HTMLElement, skin: SkinId, mode: Mode): void {
  const rendered = effectiveMode(getSkin(skin), mode)
  root.dataset.skin = skin
  root.classList.toggle('dark', rendered === 'dark')
  root.style.colorScheme = rendered
}
