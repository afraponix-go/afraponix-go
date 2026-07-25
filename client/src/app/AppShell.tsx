import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useSystems } from '../features/systems/SystemContext'
import { AddSystemModal } from '../features/systems/AddSystemModal'
import { DashboardIcon, CalculatorIcon, DataCaptureIcon, FishIcon, PlantIcon, SettingsIcon } from './icons'
import { Brand } from '../components/Brand'
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
  const [showAdd, setShowAdd] = useState(false)
  const name = user?.firstName || user?.email || 'Account'
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <div className="account">
          {systems.length > 0 && (
            <label className="sys-switch">
              <span className="sys-dot" aria-hidden />
              <select className="sys-select" value={activeId ?? ''} onChange={(e) => setActiveId(e.target.value)} aria-label="Active system">
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.system_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button className="sys-add" onClick={() => setShowAdd(true)} title="Add system" aria-label="Add system">
            {systems.length > 0 ? '+' : '+ Add system'}
          </button>
          <div className="user-chip" title={user?.email ?? undefined}>
            <span className="avatar">{initial}</span>
            <span className="who">{name}</span>
          </div>
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

      {showAdd && <AddSystemModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
