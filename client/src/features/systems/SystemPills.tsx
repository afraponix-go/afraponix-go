import { useEffect, useRef } from 'react'
import { useSystems, ALL_SYSTEMS_ID } from './SystemContext'
import { isOwnedSystem } from './api'
import { centerActiveChild } from '../../lib/scrollStrip'
import './syspills.css'

// App-wide system selector, shown at the top of each section's content (close
// to the tab it scopes, unlike a far-removed top-bar dropdown). The first pill
// is whole-farm mode — the default — followed by one pill per system. Hidden
// when the farm has a single system, where there's nothing to choose.
export function SystemPills() {
  const { systems, activeId, setActiveId } = useSystems()
  const stripRef = useRef<HTMLDivElement>(null)

  // Keep the selected pill visible when the strip scrolls horizontally (mobile).
  useEffect(() => {
    centerActiveChild(stripRef.current, '.syspill.active')
  }, [activeId, systems.length])

  if (systems.length <= 1) return null

  const ordered = [...systems].sort((a, b) =>
    a.system_name.localeCompare(b.system_name, undefined, { numeric: true, sensitivity: 'base' }),
  )

  return (
    <>
    {/* Mobile: a compact dropdown instead of a wrapping/scrolling pill strip. */}
    <select
      className="syspills-select"
      value={activeId ?? ALL_SYSTEMS_ID}
      onChange={(e) => setActiveId(e.target.value)}
      aria-label="System"
    >
      <option value={ALL_SYSTEMS_ID}>◇ All systems</option>
      {ordered.map((s) => (
        <option key={s.id} value={s.id}>{s.system_name}{isOwnedSystem(s) ? '' : ' (shared)'}</option>
      ))}
    </select>

    <div className="syspills" ref={stripRef} role="tablist" aria-label="System">
      <button
        type="button"
        role="tab"
        aria-selected={activeId === ALL_SYSTEMS_ID}
        className={`syspill all${activeId === ALL_SYSTEMS_ID ? ' active' : ''}`}
        onClick={() => setActiveId(ALL_SYSTEMS_ID)}
      >
        <span className="syspill-ico" aria-hidden>◇</span> All systems
      </button>
      {ordered.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={activeId === s.id}
          className={`syspill${activeId === s.id ? ' active' : ''}`}
          onClick={() => setActiveId(s.id)}
        >
          {s.system_name}
          {!isOwnedSystem(s) && <span className="syspill-shared">shared</span>}
        </button>
      ))}
    </div>
    </>
  )
}
