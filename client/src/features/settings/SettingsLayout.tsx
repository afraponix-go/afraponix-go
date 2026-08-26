import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useSystems } from '../systems/SystemContext'
import { isOwnedSystem } from '../systems/api'
import './settings.css'

type Item = { to: string; label: string; end?: boolean }
type Group = { title: string; hint?: string; items: Item[] }

// Grouped settings navigation. Account / Farm settings are per-user (work in
// farm mode); the "Active system" group acts on the selected system (those
// pages prompt to pick a system when the app is in farm mode). Sharing now lives
// under Farms; Admin shows for admins only.
export function SettingsLayout() {
  const { user } = useAuth()
  const { activeSystem } = useSystems()
  const owner = isOwnedSystem(activeSystem)

  const groups: Group[] = [
    { title: 'Account', items: [{ to: '/settings/account', label: 'Profile & account' }] },
    { title: 'Farm', items: [{ to: '/settings/farms', label: 'Farms & sharing' }, { to: '/settings/operators', label: 'Operators' }] },
    {
      title: 'Active system',
      hint: activeSystem?.system_name ?? undefined,
      items: [{ to: '/settings', label: 'System details', end: true }, { to: '/settings/metrics', label: 'Tracked metrics' }],
    },
  ]
  const advanced: Item[] = []
  if (owner) advanced.push({ to: '/settings/danger', label: 'Danger zone' })
  if (user?.userRole === 'admin') advanced.push({ to: '/settings/admin', label: 'Admin' })
  if (advanced.length) groups.push({ title: 'Advanced', items: advanced })

  return (
    <div>
      <h1 className="settings-h1">Settings</h1>
      <div className="settings-shell">
        <aside className="settings-nav" aria-label="Settings sections">
          {groups.map((g) => (
            <div className="settings-group" key={g.title}>
              <div className="settings-group-title">
                <span>{g.title}</span>
                {g.hint && <span className="settings-group-hint" title={g.hint}>{g.hint}</span>}
              </div>
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `settings-navlink${isActive ? ' active' : ''}`}>
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}
        </aside>
        <div className="settings-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
