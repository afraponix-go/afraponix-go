import { useSyncExternalStore } from 'react'

// A single global view preference (card vs list) shared by every Plants view, so
// switching it on one tab flips them all and survives reloads.
export type ViewMode = 'card' | 'list'
const KEY = 'afraponix_view_mode'

let listeners: Array<() => void> = []
function read(): ViewMode {
  return localStorage.getItem(KEY) === 'list' ? 'list' : 'card'
}
function write(mode: ViewMode) {
  localStorage.setItem(KEY, mode)
  listeners.forEach((l) => l())
}
function subscribe(l: () => void) {
  listeners.push(l)
  return () => {
    listeners = listeners.filter((x) => x !== l)
  }
}

export function useViewMode(): [ViewMode, (m: ViewMode) => void] {
  const mode = useSyncExternalStore<ViewMode>(subscribe, read, () => 'card')
  return [mode, write]
}

export function ViewToggle() {
  const [mode, setMode] = useViewMode()
  return (
    <div className="seg view-toggle" role="group" aria-label="View mode">
      <button
        type="button"
        className={`seg-btn ${mode === 'card' ? 'active' : ''}`}
        onClick={() => setMode('card')}
        aria-pressed={mode === 'card'}
        title="Card view"
      >
        <span aria-hidden>▦</span> Cards
      </button>
      <button
        type="button"
        className={`seg-btn ${mode === 'list' ? 'active' : ''}`}
        onClick={() => setMode('list')}
        aria-pressed={mode === 'list'}
        title="List view"
      >
        <span aria-hidden>☰</span> List
      </button>
    </div>
  )
}
