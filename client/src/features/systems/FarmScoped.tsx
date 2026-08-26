import { useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems, SystemScope } from './SystemContext'
import { fetchFarmSummary, type FarmSummary } from './farmApi'
import './farmview.css'

type Kind = 'fish' | 'plants'

// Wrap a tab's route element. Outside farm mode it renders the tab unchanged.
// In farm mode it renders one collapsible section per system, each mounting the
// same (unchanged) tab under a SystemScope so it fetches that system's data.
export function FarmScoped({ kind, children }: { kind: Kind; children: ReactNode }) {
  const { isFarmMode } = useSystems()
  if (!isFarmMode) return <>{children}</>
  return <FarmSections kind={kind}>{children}</FarmSections>
}

// Shown where a view only makes sense for one system (config/per-system tabs and
// tabs not yet farm-aware) while the app is in farm mode.
export function FarmModeNotice() {
  const { systems, setActiveId } = useSystems()
  const first = [...systems].sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true }))[0]
  return (
    <div className="empty fm-notice">
      This view works on one system at a time. Pick a system from the pills above
      {first ? <> — or <button className="link-btn" onClick={() => setActiveId(first.id)}>open {first.system_name}</button></> : ''}.
    </div>
  )
}

// Render children only for a single active system; prompt to pick one in farm mode.
export function SystemOnly({ children }: { children: ReactNode }) {
  const { isFarmMode } = useSystems()
  return isFarmMode ? <FarmModeNotice /> : <>{children}</>
}

const nf = (n: number) => Math.round(n).toLocaleString()

function farmStats(kind: Kind, t: FarmSummary['totals'], systemCount: number) {
  return kind === 'fish'
    ? [
        { v: nf(t.fish_count), k: 'Total Fish' },
        { v: `${nf(t.biomass_kg)} kg`, k: 'Biomass' },
        { v: String(systemCount), k: 'Systems' },
      ]
    : [
        { v: nf(t.plants_growing), k: 'Plants Growing' },
        { v: nf(t.plants_ready), k: 'Ready to Harvest' },
        { v: String(systemCount), k: 'Systems' },
      ]
}

function rowSummary(kind: Kind, r?: FarmSummary['systems'][number]) {
  if (!r) return { parts: [] as { b: string; t: string; warn?: boolean }[], empty: false }
  if (kind === 'fish')
    return {
      empty: r.fish_count === 0,
      parts: [
        { b: nf(r.fish_count), t: 'fish' },
        { b: `${nf(r.biomass_kg)} kg`, t: 'biomass' },
      ],
    }
  return {
    empty: r.plants_growing === 0 && r.plants_ready === 0,
    parts: [
      { b: nf(r.plants_growing), t: 'growing' },
      { b: nf(r.plants_ready), t: 'ready', warn: r.plants_ready > 0 },
    ],
  }
}

function FarmSections({ kind, children }: { kind: Kind; children: ReactNode }) {
  const { systems: unsorted, activeFarmId, activeFarm, setActiveId } = useSystems()
  const systems = [...unsorted].sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true }))
  const { data } = useQuery({
    queryKey: ['farm-summary', activeFarmId],
    queryFn: () => fetchFarmSummary(activeFarmId as string),
    enabled: !!activeFarmId,
  })
  const byId = new Map((data?.systems ?? []).map((s) => [s.id, s]))

  // Default: expand only the first system (keeps the page light and matches the
  // one-open-at-a-time feel); the rest are one-line summaries to expand on demand.
  const [open, setOpen] = useState<Set<string> | null>(null)
  const openSet = open ?? new Set(systems.slice(0, 1).map((s) => s.id))
  const toggle = (id: string) =>
    setOpen(() => {
      const next = new Set(openSet)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div className="fm">
      <div className="fm-bar">
        <div className="fm-bar-title">
          <span className="fm-eyebrow">All systems</span>
          <b>{activeFarm?.name ?? 'Farm'}</b>
        </div>
        {data
          ? farmStats(kind, data.totals, data.system_count).map((s) => (
              <div className="fm-stat" key={s.k}>
                <b>{s.v}</b>
                <span>{s.k}</span>
              </div>
            ))
          : <span className="fm-loading">Loading farm rollup…</span>}
      </div>

      {systems.length === 0 && <div className="empty">No systems in this farm yet.</div>}

      {systems.map((s) => {
        const row = byId.get(s.id)
        const sum = rowSummary(kind, row)
        const isOpen = openSet.has(s.id)
        return (
          <section className={`fm-sys${isOpen ? ' open' : ''}`} key={s.id}>
            <div className="fm-head" onClick={() => toggle(s.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(s.id) } }}
              aria-expanded={isOpen}>
              <span className="fm-chev" aria-hidden>▸</span>
              <span className="fm-name">
                {s.system_name}
                <button className="fm-zoom" title={`Open ${s.system_name}`}
                  onClick={(e) => { e.stopPropagation(); setActiveId(s.id) }}>Open ↗</button>
              </span>
              <span className="fm-sum">
                {sum.empty && row ? (
                  <span className="fm-empty-badge">empty</span>
                ) : (
                  sum.parts.map((p, i) => (
                    <span className={`fm-m${p.warn ? ' warn' : ''}`} key={i}><b>{p.b}</b> {p.t}</span>
                  ))
                )}
              </span>
            </div>
            {isOpen && (
              <div className="fm-body">
                <SystemScope systemId={s.id}>{children}</SystemScope>
              </div>
            )}
          </section>
        )
      })}
      <p className="fm-hint">Click a system to expand · click <b>Open ↗</b> to switch to just that system.</p>
    </div>
  )
}
