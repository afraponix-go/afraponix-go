import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

export type SubTab = { to: string; label: string; end?: boolean }

// A section (Dashboard / Data Capture / Settings) that has a horizontal
// sub-tab strip above its routed content. On narrow screens the strip scrolls
// horizontally; we fade the overflowing edge(s) to signal that and keep the
// active tab scrolled into view.
export function SubTabLayout({ items }: { items: SubTab[] }) {
  const navRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // Toggle edge-fade affordances based on scroll position.
  const updateFade = () => {
    const el = navRef.current
    if (!el) return
    const left = el.scrollLeft > 2
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
    el.dataset.fade = left && right ? 'both' : left ? 'left' : right ? 'right' : 'none'
  }

  // Keep the active tab visible when the route changes (e.g. deep-link or a tab
  // that starts off-screen on mobile), then recompute the fades.
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    el.querySelector<HTMLElement>('a.active')?.scrollIntoView({ inline: 'center', block: 'nearest' })
    updateFade()
  }, [pathname, items])

  return (
    <div>
      <nav ref={navRef} className="subtabs" aria-label="Section" onScroll={updateFade}>
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
