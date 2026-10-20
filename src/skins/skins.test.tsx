import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkinProvider, useSkin } from './SkinContext'
import { MODE_KEY, SKIN_KEY, applySkin, effectiveMode, getSkin, loadPreference } from './skins'

const Probe = () => {
  const { skin, mode, canToggleMode, setSkin, toggleMode } = useSkin()
  return (
    <div>
      <span data-testid="skin">{skin.id}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="can-toggle">{String(canToggleMode)}</span>
      <button onClick={toggleMode}>toggle</button>
      <button onClick={() => setSkin('terminal')}>terminal</button>
      <button onClick={() => setSkin('tailadmin')}>tailadmin</button>
    </div>
  )
}

const root = () => document.documentElement

beforeEach(() => {
  window.localStorage.clear()
  root().removeAttribute('data-skin')
  root().classList.remove('dark')
})

describe('skins', () => {
  it('falls back to the default skin for unknown ids', () => {
    expect(getSkin('nope').id).toBe('tailadmin')
    expect(getSkin(null).id).toBe('tailadmin')
  })

  it('renders a single-mode skin in its own mode', () => {
    expect(effectiveMode(getSkin('terminal'), 'light')).toBe('dark')
    expect(effectiveMode(getSkin('tailadmin'), 'dark')).toBe('dark')
  })

  it('ignores invalid stored values', () => {
    window.localStorage.setItem(SKIN_KEY, 'neon')
    window.localStorage.setItem(MODE_KEY, 'sepia')
    expect(loadPreference()).toEqual({ skin: 'tailadmin', mode: 'light' })
  })

  it('applies the skin attribute and the dark class', () => {
    applySkin(root(), 'tailadmin', 'dark')
    expect(root().dataset.skin).toBe('tailadmin')
    expect(root().classList.contains('dark')).toBe(true)
    applySkin(root(), 'terminal', 'light')
    expect(root().dataset.skin).toBe('terminal')
    expect(root().classList.contains('dark')).toBe(true)
  })
})

describe('SkinProvider', () => {
  it('starts on TailAdmin light and toggles to dark, persisting both', async () => {
    render(<SkinProvider><Probe /></SkinProvider>)
    expect(screen.getByTestId('skin').textContent).toBe('tailadmin')
    expect(screen.getByTestId('mode').textContent).toBe('light')
    expect(root().classList.contains('dark')).toBe(false)

    await userEvent.click(screen.getByText('toggle'))
    expect(screen.getByTestId('mode').textContent).toBe('dark')
    expect(root().classList.contains('dark')).toBe(true)
    expect(window.localStorage.getItem(MODE_KEY)).toBe('dark')
    expect(window.localStorage.getItem(SKIN_KEY)).toBe('tailadmin')
  })

  it('forces dark for Terminal and disables the toggle', async () => {
    render(<SkinProvider><Probe /></SkinProvider>)
    await userEvent.click(screen.getByText('terminal'))
    expect(root().dataset.skin).toBe('terminal')
    expect(screen.getByTestId('mode').textContent).toBe('dark')
    expect(screen.getByTestId('can-toggle').textContent).toBe('false')
  })

  it('keeps the mode last shown when coming back from Terminal', async () => {
    render(<SkinProvider><Probe /></SkinProvider>)
    await userEvent.click(screen.getByText('terminal'))
    await userEvent.click(screen.getByText('tailadmin'))
    expect(screen.getByTestId('mode').textContent).toBe('light')
  })

  it('restores the stored choice', () => {
    window.localStorage.setItem(SKIN_KEY, 'tailadmin')
    window.localStorage.setItem(MODE_KEY, 'dark')
    act(() => { render(<SkinProvider><Probe /></SkinProvider>) })
    expect(screen.getByTestId('mode').textContent).toBe('dark')
    expect(root().classList.contains('dark')).toBe(true)
  })

  it('throws outside the provider', () => {
    const err = console.error
    console.error = () => {}
    expect(() => render(<Probe />)).toThrow(/SkinProvider/)
    console.error = err
  })
})
