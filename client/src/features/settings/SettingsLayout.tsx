import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import type { User } from '../auth/api'
import { isOwnedSystem } from '../systems/api'
import { SettingsSystemProvider, useSettingsSystem } from './settingsSystem'
import { centerActiveChild } from '../../lib/scrollStrip'
import './settings.css'

type Item = { to: string; label: string; end?: boolean }
type Group = { title: string; items: Item[] }

// Settings routes that act on one specific system (rather than the whole
// account or farm). On these, we show a system scope bar above the content.
const SYSTEM_SCOPED = new Set(['/settings', '/settings/metrics', '/settings/danger'])

// The full grouped navigation. Account / Farm settings are per-user; the System
// group's pages act on one system, chosen via the scope bar above the content.
function buildGroups(user: User | null, owner: boolean): Group[] {
  const groups: Group[] = [
    { title: 'Account', items: [{ to: '/settings/account', label: 'Profile & account' }] },
    { title: 'Farm', items: [{ to: '/settings/farms', label: 'Farms & sharing' }, { to: '/settings/operators', label: 'Operators' }] },
    { title: 'System', items: [{ to: '/settings', label: 'System details', end: true }, { to: '/settings/metrics', label: 'Tracked metrics' }] },
  ]
  const advanced: Item[] = []
  if (owner) advanced.push({ to: '/settings/danger', label: 'Danger zone' })
  if (user?.userRole === 'admin') advanced.push({ to: '/settings/admin', label: 'Admin' })
  if (advanced.length) groups.push({ title: 'Advanced', items: advanced })
  return groups
}

const matches = (pathname: string, it: Item) =>
  it.end ? pathname === it.to : pathname === it.to || pathname.startsWith(it.to + '/')

export function SettingsLayout() {
  return (
    <SettingsSystemProvider>
      <SettingsChrome />
    </SettingsSystemProvider>
  )
}

// A Cloudflare-style settings shell: the section list lives in a slide-in drawer
// toggled by a hamburger, so the content gets the full width and the nav never
// crowds it (a real win on mobile). The current section shows next to the title.
function SettingsChrome() {
  const { user } = useAuth()
  const { system } = useSettingsSystem()
  const owner = isOwnedSystem(system)
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  const groups = useMemo(() => buildGroups(user, owner), [user, owner])
  const activeLabel = useMemo(() => {
    for (const g of groups) for (const it of g.items) if (matches(pathname, it)) return it.label
    return 'Overview'
  }, [groups, pathname])

  // Close the drawer on navigation and on Escape.
  useEffect(() => { setNavOpen(false) }, [pathname])
  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])

  return (
    <div>
      <div className="settings-topline">
        <button
          type="button"
          className="settings-menu-btn"
          onClick={() => setNavOpen(true)}
          aria-label="Open settings menu"
          aria-expanded={navOpen}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" />
          </svg>
        </button>
        <h1 className="settings-h1">Settings</h1>
        <span className="settings-crumb" aria-hidden>{activeLabel}</span>
      </div>

      <div className="settings-content">
        <SystemScopeBar />
        <Outlet />
      </div>

      {navOpen && <div className="settings-drawer-backdrop" onClick={() => setNavOpen(false)} />}
      <SettingsNav groups={groups} pathname={pathname} open={navOpen} onClose={() => setNavOpen(false)} />
    </div>
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

function SettingsNav({ groups, pathname, open, onClose }: { groups: Group[]; pathname: string; open: boolean; onClose: () => void }) {
  return (
    <aside className={`settings-drawer${open ? ' open' : ''}`} aria-label="Settings sections" aria-hidden={!open}>
      <div className="settings-drawer-head">
        <span>Settings</span>
        <button type="button" className="settings-drawer-close" onClick={onClose} aria-label="Close settings menu">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>
      </div>
      {groups.map((g) => (
        <div className="settings-group" key={g.title}>
          <div className="settings-group-title"><span>{g.title}</span></div>
          {g.items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={`settings-navlink${matches(pathname, it) ? ' active' : ''}`}
            >
              {it.label}
            </NavLink>
          ))}
        </div>
      ))}
    </aside>
  )
}
