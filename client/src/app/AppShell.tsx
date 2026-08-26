import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useSystems, ALL_SYSTEMS_ID } from '../features/systems/SystemContext'
import { isOwnedSystem } from '../features/systems/api'
import { AddSystemModal } from '../features/systems/AddSystemModal'
import { DashboardIcon, CalculatorIcon, DataCaptureIcon, FishIcon, PlantIcon, SprayIcon, SettingsIcon } from './icons'
import { Brand } from '../components/Brand'
import { ThemeToggle } from './ThemeToggle'
import './shell.css'

// Bottom tab bar. The first four are the daily-use sections shown on mobile;
// the rest collapse into a "More" sheet on small screens (all show on desktop).
const TABS = [
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, end: true },
  { to: '/data', label: 'Log', Icon: DataCaptureIcon },
  { to: '/fish', label: 'Fish', Icon: FishIcon },
  { to: '/plants', label: 'Plants', Icon: PlantIcon },
  { to: '/operations', label: 'Operations', Icon: SprayIcon },
  { to: '/calculator', label: 'Calculator', Icon: CalculatorIcon },
]
const PRIMARY_COUNT = 4
const OVERFLOW = TABS.slice(PRIMARY_COUNT)

export function AppShell() {
  const { user, signOut } = useAuth()
  const { systems, activeId, activeSystem, setActiveId, farms, activeFarmId, setActiveFarmId } = useSystems()
  const activeShared = activeSystem != null && !isOwnedSystem(activeSystem)
  const [showAdd, setShowAdd] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const name = user?.firstName || user?.email || 'Account'
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()

  // Close the popovers on navigation.
  useEffect(() => { setMoreOpen(false); setMenuOpen(false) }, [pathname])

  const moreActive = OVERFLOW.some((t) => pathname === t.to || pathname.startsWith(t.to + '/'))

  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <div className="account">
          {farms.length > 1 && (
            <label className="farm-switch" title="Active farm">
              <span className="farm-ico" aria-hidden>⌂</span>
              <select className="farm-select" value={activeFarmId ?? ''} onChange={(e) => setActiveFarmId(e.target.value)} aria-label="Active farm">
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}{f.kind === 'shared' ? ' (shared)' : ''}</option>
                ))}
              </select>
            </label>
          )}
          {systems.length > 0 && (
            <label className="sys-switch">
              <span className="sys-dot" aria-hidden />
              <select className="sys-select" value={activeId ?? ''} onChange={(e) => setActiveId(e.target.value)} aria-label="Active system">
                {systems.length > 1 && <option value={ALL_SYSTEMS_ID}>◇ All systems</option>}
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.system_name}
                    {isOwnedSystem(s) ? '' : ' (shared)'}
                  </option>
                ))}
              </select>
              {activeShared && (
                <span className="shared-badge" title={`Shared with you — ${activeSystem?.shared_permission} access`}>
                  Shared
                </span>
              )}
            </label>
          )}

          {/* Quick add-system (contextual to the system switcher) */}
          <button className="sys-add" onClick={() => setShowAdd(true)} title="Add system" aria-label="Add system">
            {systems.length > 0 ? '+' : '+ Add system'}
          </button>

          {/* User menu — identity, settings, theme, log out */}
          <div className="user-menu-wrap">
            <button className="user-chip" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} title={user?.email ?? undefined}>
              <span className="avatar">{initial}</span>
              <span className="who">{name}</span>
              <span className="chip-caret" aria-hidden>▾</span>
            </button>
            {menuOpen && (
              <>
                <div className="popover-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="account-menu" role="menu">
                  <div className="user-id">
                    <span className="avatar">{initial}</span>
                    <span className="user-id-text">
                      <b>{name}</b>
                      {user?.email && <span>{user.email}</span>}
                    </span>
                  </div>
                  <div className="menu-sep" />
                  <NavLink to="/settings" className="account-menu-item" role="menuitem">
                    <SettingsIcon className="ami-icon" /> Settings
                  </NavLink>
                  <div className="account-menu-item as-toggle"><ThemeToggle /></div>
                  <div className="menu-sep" />
                  <button className="account-menu-item danger" onClick={signOut}>Log out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottomnav" aria-label="Primary">
        {TABS.map(({ to, label, Icon, end }, i) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `tab${isActive ? ' active' : ''}${i >= PRIMARY_COUNT ? ' tab-overflow' : ''}`}>
            <Icon className="tab-icon" />
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}
        <button type="button" className={`tab more-toggle${moreActive ? ' active' : ''}`} onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} aria-label="More sections">
          <span className="tab-icon more-dots" aria-hidden>⋯</span>
          <span className="tab-label">More</span>
        </button>

        {moreOpen && (
          <>
            <div className="popover-backdrop" onClick={() => setMoreOpen(false)} />
            <div className="more-sheet" role="menu">
              {OVERFLOW.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => `more-item${isActive ? ' active' : ''}`}>
                  <Icon className="more-item-icon" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {showAdd && <AddSystemModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
