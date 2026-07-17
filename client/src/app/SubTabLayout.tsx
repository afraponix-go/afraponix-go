import { NavLink, Outlet } from 'react-router-dom'

export type SubTab = { to: string; label: string; end?: boolean }

// A section (Dashboard / Data Capture / Settings) that has a horizontal
// sub-tab strip above its routed content.
export function SubTabLayout({ items }: { items: SubTab[] }) {
  return (
    <div>
      <nav className="subtabs" aria-label="Section">
        {items.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}

export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <div className="placeholder">
        <h2>{title} — coming next</h2>
        <p>{note ?? 'This section is queued in the rebuild and will be built against the existing API.'}</p>
      </div>
    </div>
  )
}
