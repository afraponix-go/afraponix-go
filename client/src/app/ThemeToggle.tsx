import { useState } from 'react'
import { getInitialTheme, applyTheme, storeTheme, type Theme } from './theme'

// "Power saver" toggle — flips between light and dark. Dark is framed as the
// energy-saving mode, matching afraponix.com.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const dark = theme === 'dark'

  function toggle() {
    const next: Theme = dark ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    storeTheme(next)
  }

  return (
    <button
      type="button"
      className={`saver${dark ? ' on' : ''}`}
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      title={dark ? 'Power saver on — switch to light' : 'Power saver — dark mode saves screen energy'}
    >
      <svg className="saver-leaf" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.5 3.5s-8.4-1.1-13.4 3.9C4 10.5 3.9 15.8 6 18c2.1 2.1 7.5 2 10.6-1.1 5-5 3.9-13.4 3.9-13.4Zm-13 15C8 14.7 10.2 11 14.4 8.3 11.4 12 9.2 15 7.5 18.5Z"
        />
      </svg>
      <span className="saver-label">Power saver</span>
      <span className="saver-track" aria-hidden="true">
        <span className="saver-knob" />
      </span>
    </button>
  )
}
