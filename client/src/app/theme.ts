// Light/dark theming. tokens.css defines three states: :root (light),
// :root[data-theme='dark'], and a prefers-color-scheme:dark default for anyone
// who hasn't chosen. "Power saver" = dark mode (energy-saving, on-brand).
export type Theme = 'light' | 'dark'

const KEY = 'afraponix_theme'

// The theme currently in effect: an explicit choice if stored, else the OS.
export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* localStorage unavailable */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
}
