import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import './shell.css'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/fish', label: 'Fish' },
  { to: '/plants', label: 'Plants' },
  { to: '/grow-beds', label: 'Grow Beds' },
  { to: '/water', label: 'Water Quality' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const name = user?.firstName || user?.email || 'Account'
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          Afraponix Go
        </div>
        <nav className="mainnav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="account">
          <span className="who">{name}</span>
          <button className="ghost" onClick={signOut}>
            Log out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
