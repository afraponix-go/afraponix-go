import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { useSystems } from '../features/systems/SystemContext'
import { AddSystemModal } from '../features/systems/AddSystemModal'
import { NewFarmModal } from '../features/systems/NewFarmModal'
import { OnboardingTour, startTour } from '../features/onboarding/OnboardingTour'
import { ADD_SYSTEM_EVENT } from '../features/onboarding/FirstRunWelcome'
import { DashboardIcon, ScanIcon, TodayIcon, CalculatorIcon, DataCaptureIcon, FishIcon, PlantIcon, SprayIcon, SettingsIcon } from './icons'
import { Brand } from '../components/Brand'
import { ThemeToggle } from './ThemeToggle'
import { useOperatorMode } from '../features/operator/operatorMode'
import './shell.css'

// Bottom tab bar. The first four are the daily-use sections shown on mobile;
// the rest collapse into a "More" sheet on small screens (all show on desktop).
// Scan leads (operators live in it); the Dashboard is reached via the logo and
// the More sheet.
const TABS = [
  { to: '/scan', label: 'Scan', Icon: ScanIcon },
  { to: '/data', label: 'Log', Icon: DataCaptureIcon },
  { to: '/fish', label: 'Fish', Icon: FishIcon },
  { to: '/plants', label: 'Plants', Icon: PlantIcon },
  { to: '/operations', label: 'Operations', Icon: SprayIcon },
  { to: '/calculator', label: 'Calculator', Icon: CalculatorIcon },
  { to: '/', label: 'Dashboard', Icon: DashboardIcon, end: true },
]
const PRIMARY_COUNT = 4
const OVERFLOW = TABS.slice(PRIMARY_COUNT)

// A restricted operator session (real or previewed): just the three things an
// operator actually does — nothing collapses into "More".
const OPERATOR_TABS = [
  { to: '/scan', label: 'Scan', Icon: ScanIcon },
  { to: '/', label: 'Today', Icon: TodayIcon, end: true },
  { to: '/log', label: 'Log', Icon: DataCaptureIcon },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { systems, farms, activeFarm, activeFarmId, setActiveFarmId } = useSystems()
  const { isOperatorView, canToggle, viewAsOperator, setViewAsOperator } = useOperatorMode()
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

  const tabs = isOperatorView ? OPERATOR_TABS : TABS
  const primaryCount = isOperatorView ? tabs.length : PRIMARY_COUNT
  const overflow = isOperatorView ? [] : OVERFLOW
  const moreActive = overflow.some((t) => pathname === t.to || pathname.startsWith(t.to + '/'))

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand-link" aria-label="Go to dashboard">
          <Brand />
        </Link>
        <div className="account">
          {isDemoFarm && <span className="demo-badge" title="You're viewing the sample farm — not your real data">Demo</span>}
          {!isOperatorView && farms.length > 1 && (
            <label className="farm-switch" title="Active farm">
              <span className="farm-ico" aria-hidden>⌂</span>
              <select className="farm-select" value={activeFarmId ?? ''} onChange={(e) => setActiveFarmId(e.target.value)} aria-label="Active farm">
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}{f.kind === 'shared' ? ' (shared)' : ''}</option>
                ))}
              </select>
            </label>
          )}
          {/* Add menu — a system in this farm, or a whole new farm. Not for an
              operator session: adding systems/farms is owner/admin territory. */}
          {!isOperatorView && (
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
          )}

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
                  {/* Settings holds sharing, farms and billing — out of bounds
                      for a restricted operator session. */}
                  {!isOperatorView && (
                    <NavLink to="/settings" className="account-menu-item" role="menuitem">
                      <SettingsIcon className="ami-icon" /> Settings
                    </NavLink>
                  )}
                  {!isOperatorView && (
                    <button className="account-menu-item" role="menuitem" onClick={() => { setMenuOpen(false); startTour() }}>
                      <span className="ami-icon" aria-hidden>🧭</span> Take a tour
                    </button>
                  )}
                  <div className="account-menu-item as-toggle"><ThemeToggle /></div>
                  {/* A client-side view switch only — it changes nothing about
                      what the account can actually do. Never offered to a real
                      operator account (canToggle is false for one). */}
                  {canToggle && (
                    <button
                      className="account-menu-item"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        setViewAsOperator(!viewAsOperator)
                        // Land back on Today/Dashboard — whatever route was open
                        // (e.g. Settings) may no longer make sense in the new mode.
                        navigate('/')
                      }}
                    >
                      <span className="ami-icon" aria-hidden>{viewAsOperator ? '↩' : '🪪'}</span>
                      {viewAsOperator ? 'Switch back' : 'Switch to operator'}
                    </button>
                  )}
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
        {tabs.map(({ to, label, Icon, end }, i) => (
          <NavLink key={to} to={to} end={end} data-tour={`nav:${to}`} className={({ isActive }) => `tab${isActive ? ' active' : ''}${i >= primaryCount ? ' tab-overflow' : ''}`}>
            <Icon className="tab-icon" />
            <span className="tab-label">{label}</span>
          </NavLink>
        ))}
        {overflow.length > 0 && (
          <button type="button" className={`tab more-toggle${moreActive ? ' active' : ''}`} onClick={() => setMoreOpen((v) => !v)} aria-expanded={moreOpen} aria-label="More sections">
            <span className="tab-icon more-dots" aria-hidden>⋯</span>
            <span className="tab-label">More</span>
          </button>
        )}

        {moreOpen && overflow.length > 0 && (
          <>
            <div className="popover-backdrop" onClick={() => setMoreOpen(false)} />
            <div className="more-sheet" role="menu">
              {overflow.map(({ to, label, Icon }) => (
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
