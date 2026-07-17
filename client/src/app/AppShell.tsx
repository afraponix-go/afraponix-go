import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useSystems } from '../features/systems/SystemContext'
import { DashboardIcon, CalculatorIcon, DataCaptureIcon, FishIcon, PlantIcon, SettingsIcon } from './icons'
import './shell.css'

// Bottom tab bar matching the original app's information architecture.
const TABS = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/calculator', label: 'Calculator', Icon: CalculatorIcon },
  { to: '/data', label: 'Data Capture', Icon: DataCaptureIcon },
  { to: '/fish', label: 'Fish', Icon: FishIcon },
  { to: '/plants', label: 'Plants', Icon: PlantIcon },
  { to: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const { systems, activeId, setActiveId } = useSystems()
  const name = user?.firstName || user?.email || 'Account'
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          Afraponix Go
        </div>
        <div className="account">
          {systems.length > 0 && (
            <select className="sys-select" value={activeId ?? ''} onChange={(e) => setActiveId(e.target.value)} aria-label="Active system">
              {systems.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.system_name}
                </option>
              ))}
            </select>
          )}
          <span className="who">{name}</span>
          <button className="ghost" onClick={signOut}>
            Log out
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottomnav" aria-label="Primary">
        {TABS.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            <Icon className="tab-icon" />
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
