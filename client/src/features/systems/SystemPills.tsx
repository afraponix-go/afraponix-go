import { useSystems, ALL_SYSTEMS_ID } from './SystemContext'
import { isOwnedSystem } from './api'
import './syspills.css'

// App-wide system selector, shown at the top of each section's content (close
// to the tab it scopes, unlike a far-removed top-bar dropdown). The first pill
// is whole-farm mode — the default — followed by one pill per system. Hidden
// when the farm has a single system, where there's nothing to choose.
export function SystemPills() {
  const { systems, activeId, setActiveId } = useSystems()
  if (systems.length <= 1) return null

  const ordered = [...systems].sort((a, b) =>
    a.system_name.localeCompare(b.system_name, undefined, { numeric: true, sensitivity: 'base' }),
  )

  return (
    <div className="syspills" role="tablist" aria-label="System">
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
  )
}
