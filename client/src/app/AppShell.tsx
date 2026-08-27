import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useSystems } from '../features/systems/SystemContext'
import { AddSystemModal } from '../features/systems/AddSystemModal'
import { NewFarmModal } from '../features/systems/NewFarmModal'
import { OnboardingTour, startTour } from '../features/onboarding/OnboardingTour'
import { ADD_SYSTEM_EVENT } from '../features/onboarding/FirstRunWelcome'
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
  const qc = useQueryClient()
  const { systems, farms, activeFarm, activeFarmId, setActiveFarmId } = useSystems()
  const [showAdd, setShowAdd] = useState(false)
  const [addFarmId, setAddFarmId] = useState<string | undefined>(undefined)
  const [showNewFarm, setShowNewFarm] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const name = user?.firstName || user?.email || 'Account'
  const initial = (user?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()
  // Only owned farms can take a new system; a shared farm is someone else's.
  const canAddToFarm = activeFarm?.kind === 'own'
  // Sample-data farm created by "Load a sample farm" — flag it so it's never
  // mistaken for real data.
  const isDemoFarm = activeFarm?.name === 'Demo Farm'

  // Close the popovers on navigation.
  useEffect(() => { setMoreOpen(false); setMenuOpen(false); setAddOpen(false) }, [pathname])

  // The first-run welcome asks us to open the add-system wizard.
  useEffect(() => {
    const onAdd = () => { setAddFarmId(undefined); setShowAdd(true) }
    window.addEventListener(ADD_SYSTEM_EVENT, onAdd)
    return () => window.removeEventListener(ADD_SYSTEM_EVENT, onAdd)
  }, [])

  const moreActive = OVERFLOW.some((t) => pathname === t.to || pathname.startsWith(t.to + '/'))

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand-link" aria-label="Go to dashboard">
          <Brand />
        </Link>
        <div className="account">
          {isDemoFarm && <span className="demo-badge" title="You're viewing the sample farm — not your real data">Demo</span>}
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
          {/* Add menu — a system in this farm, or a whole new farm */}
          <div className="add-menu-wrap">
            <button className="sys-add" data-tour="add" onClick={() => setAddOpen((v) => !v)} title="Add" aria-haspopup="menu" aria-expanded={addOpen} aria-label="Add system or farm">
              {systems.length > 0 ? '+' : '+ Add system'}
            </button>
            {addOpen && (
              <>
                <div className="popover-backdrop" onClick={() => setAddOpen(false)} />
                <div className="add-menu" role="menu">
                  {canAddToFarm && (
                    <button className="add-menu-item" role="menuitem" onClick={() => { setAddOpen(false); setAddFarmId(undefined); setShowAdd(true) }}>
                      <span className="add-menu-title">Add system</span>
                      <span className="add-menu-sub">to {activeFarm?.name ?? 'this farm'}</span>
                    </button>
                  )}
                  <button className="add-menu-item" role="menuitem" onClick={() => { setAddOpen(false); setShowNewFarm(true) }}>
                    <span className="add-menu-title">New farm</span>
                    <span className="add-menu-sub">a separate farm with its own systems</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* User menu — identity, settings, theme, log out */}
          <div className="user-menu-wrap">
            <button className="user-chip" data-tour="account" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} title={user?.email ?? undefined}>
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
                  <button className="account-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); startTour() }}>
                    <span className="ami-icon" aria-hidden>🧭</span> Take a tour
                  </button>
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
          <NavLink key={to} to={to} end={end} data-tour={`nav:${to}`} className={({ isActive }) => `tab${isActive ? ' active' : ''}${i >= PRIMARY_COUNT ? ' tab-overflow' : ''}`}>
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

      <OnboardingTour />
      {showAdd && <AddSystemModal farmId={addFarmId} onClose={() => { setShowAdd(false); setAddFarmId(undefined) }} />}
      {showNewFarm && (
        <NewFarmModal
          onClose={() => setShowNewFarm(false)}
          onCreated={async (farm) => {
            // Refetch farms so the new one is in context before we switch to it
            // (otherwise the "keep active farm valid" guard would bounce it back).
            await qc.invalidateQueries({ queryKey: ['farms'] })
            setActiveFarmId(farm.id)
            setShowNewFarm(false)
            // Jump straight into adding the new farm's first system, targeting it
            // explicitly in case context hasn't settled yet.
            setAddFarmId(farm.id)
            setShowAdd(true)
          }}
        />
      )}
    </div>
  )
}
