import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { isOwnedSystem } from '../systems/api'
import { SettingsSystemProvider, useSettingsSystem } from './settingsSystem'
import './settings.css'

type Item = { to: string; label: string; end?: boolean }
type Group = { title: string; hint?: string; items: Item[] }

// Grouped settings navigation. Account / Farm settings are per-user (work in
// farm mode); the "Systems" group edits any one system in the active farm via
// an in-place picker — no need to change the app-wide active system.
export function SettingsLayout() {
  return (
    <SettingsSystemProvider>
      <div>
        <h1 className="settings-h1">Settings</h1>
        <div className="settings-shell">
          <SettingsNav />
          <div className="settings-content">
            <Outlet />
          </div>
        </div>
      </div>
    </SettingsSystemProvider>
  )
}

function SettingsNav() {
  const { user } = useAuth()
  const { systems, systemId, setSystemId, system } = useSettingsSystem()
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

      {/* System settings — pick any system in the farm, then edit it. */}
      <div className="settings-group">
        <div className="settings-group-title"><span>Systems</span></div>
        {systems.length > 1 && (
          <select
            className="settings-system-picker"
            value={systemId ?? ''}
            onChange={(e) => setSystemId(e.target.value)}
            aria-label="System to configure"
          >
            {systems.map((s) => (
              <option key={s.id} value={s.id}>{s.system_name}{isOwnedSystem(s) ? '' : ' (shared)'}</option>
            ))}
          </select>
        )}
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
