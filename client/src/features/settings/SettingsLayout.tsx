import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isOwnedSystem } from '../systems/api'
import { SettingsSystemProvider, useSettingsSystem } from './settingsSystem'
import { centerActiveChild } from '../../lib/scrollStrip'
import './settings.css'

type Item = { to: string; label: string; end?: boolean }
type Group = { title: string; hint?: string; items: Item[] }

// Settings routes that act on one specific system (rather than the whole
// account or farm). On these, we show a system scope bar above the content.
const SYSTEM_SCOPED = new Set(['/settings', '/settings/metrics', '/settings/danger'])

// Grouped settings navigation. Account / Farm settings are per-user (work in
// farm mode); the system-scoped pages act on one system in the active farm,
// chosen via the scope bar above the content — no need to change the app-wide
// active system.
export function SettingsLayout() {
  return (
    <SettingsSystemProvider>
      <div>
        <h1 className="settings-h1">Settings</h1>
        <div className="settings-shell">
          <SettingsNav />
          <div className="settings-content">
            <SystemScopeBar />
            <Outlet />
          </div>
        </div>
      </div>
    </SettingsSystemProvider>
  )
}

// Shown at the top of system-scoped settings pages. Makes it explicit that
// these settings belong to one system and lets the user switch which — as a
// segmented control, not a menu dropdown, so it never reads as navigation.
function SystemScopeBar() {
  const { pathname } = useLocation()
  const { systems, systemId, setSystemId, system } = useSettingsSystem()
  const stripRef = useRef<HTMLDivElement>(null)

  // Keep the selected chip visible when the strip scrolls horizontally (mobile).
  useEffect(() => {
    centerActiveChild(stripRef.current, '.settings-scope-chip.active')
  }, [systemId, systems.length])

  if (!SYSTEM_SCOPED.has(pathname) || systems.length === 0) return null

  const ordered = [...systems].sort((a, b) =>
    a.system_name.localeCompare(b.system_name, undefined, { numeric: true, sensitivity: 'base' }),
  )

  return (
    <div className="settings-scopebar">
      <span className="settings-scopebar-label">Settings for</span>
      {systems.length > 1 ? (
        <div className="settings-scope-chips" ref={stripRef} role="tablist" aria-label="System to configure">
          {ordered.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === systemId}
              className={`settings-scope-chip${s.id === systemId ? ' active' : ''}`}
              onClick={() => setSystemId(s.id)}
            >
              {s.system_name}
              {!isOwnedSystem(s) && <span className="settings-scope-shared">shared</span>}
            </button>
          ))}
        </div>
      ) : (
        <span className="settings-scope-single">{system?.system_name}</span>
      )}
    </div>
  )
}

function SettingsNav() {
  const { user } = useAuth()
  const { system } = useSettingsSystem()
  const owner = isOwnedSystem(system)

  const groups: Group[] = [
    { title: 'Account', items: [{ to: '/settings/account', label: 'Profile & account' }] },
    { title: 'Farm', items: [{ to: '/settings/farms', label: 'Farms & sharing' }, { to: '/settings/operators', label: 'Operators' }] },
  ]
  const advanced: Item[] = []
  if (owner) advanced.push({ to: '/settings/danger', label: 'Danger zone' })
  if (user?.userRole === 'admin') advanced.push({ to: '/settings/admin', label: 'Admin' })

  return (
    <aside className="settings-nav" aria-label="Settings sections">
      {groups.map((g) => (
        <div className="settings-group" key={g.title}>
          <div className="settings-group-title"><span>{g.title}</span></div>
          {g.items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `settings-navlink${isActive ? ' active' : ''}`}>
              {it.label}
            </NavLink>
          ))}
        </div>
      ))}

      {/* System-scoped pages. Which system they act on is chosen in the scope
          bar above the content, not here — the nav stays pure navigation. */}
      <div className="settings-group">
        <div className="settings-group-title"><span>System</span></div>
        <NavLink to="/settings" end className={({ isActive }) => `settings-navlink${isActive ? ' active' : ''}`}>System details</NavLink>
        <NavLink to="/settings/metrics" className={({ isActive }) => `settings-navlink${isActive ? ' active' : ''}`}>Tracked metrics</NavLink>
      </div>

      {advanced.length > 0 && (
        <div className="settings-group">
          <div className="settings-group-title"><span>Advanced</span></div>
          {advanced.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => `settings-navlink${isActive ? ' active' : ''}`}>
              {it.label}
            </NavLink>
          ))}
        </div>
      )}
    </aside>
  )
}
