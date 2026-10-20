import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FC, type ReactNode } from 'react'
import {
  SKINS, applySkin, effectiveMode, getSkin, loadPreference, savePreference,
  type Mode, type Skin, type SkinId,
} from './skins'

interface SkinState {
  skin: Skin
  /** The mode on screen (a single-mode skin overrides the stored choice). */
  mode: Mode
  skins: readonly Skin[]
  setSkin: (id: SkinId) => void
  toggleMode: () => void
  /** False when the active skin defines only one mode. */
  canToggleMode: boolean
}

const SkinContext = createContext<SkinState | null>(null)

export const SkinProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [pref, setPref] = useState(loadPreference)

  useEffect(() => {
    applySkin(document.documentElement, pref.skin, pref.mode)
    savePreference(pref.skin, pref.mode)
  }, [pref])

  const setSkin = useCallback((id: SkinId) => setPref(p => ({ ...p, skin: id })), [])

  // Flips the mode on screen and stores it, so moving to a two-mode skin keeps
  // what the user last saw rather than a stale stored value.
  const toggleMode = useCallback(() => setPref(p => {
    const shown = effectiveMode(getSkin(p.skin), p.mode)
    return { ...p, mode: shown === 'dark' ? 'light' : 'dark' }
  }), [])

  const value = useMemo<SkinState>(() => {
    const skin = getSkin(pref.skin)
    return {
      skin,
      mode: effectiveMode(skin, pref.mode),
      skins: SKINS,
      setSkin,
      toggleMode,
      canToggleMode: skin.modes.length > 1,
    }
  }, [pref, setSkin, toggleMode])

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>
}

export function useSkin(): SkinState {
  const ctx = useContext(SkinContext)
  if (!ctx) throw new Error('useSkin must be used inside <SkinProvider>')
  return ctx
}
