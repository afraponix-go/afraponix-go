import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import type { System } from '../systems/api'
import { fetchFishInventory, tankMaxDensity } from '../fish/api'
import { fetchGrowBedConfigs } from '../growbeds/api'
import { fetchBatches } from '../plants/batches'
import { fetchCropOptions, plantsPerM2FromSpacing } from '../plants/crops'
import { buildBedViews, tankM3 } from './FarmLayout'
import '../systems/farmview.css'
import './farm.css'

// A compact, whole-farm layout: one card per system with a mini fish-tank row
// and mini bed-fill bars. Click a card to zoom into that system's full,
// interactive layout (where tanks and beds can be acted on).
export function FarmLayoutOverview() {
  const { systems, setActiveId, activeFarm } = useSystems()
  const ordered = [...systems].sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true }))

  return (
    <div className="fm">
      <div className="fm-bar">
        <div className="fm-bar-title">
          <span className="fm-eyebrow">All systems</span>
          <b>{activeFarm?.name ?? 'Farm'}</b>
        </div>
        <span className="fm-loading">Click a system to open its full layout</span>
      </div>

      {ordered.length === 0 && <div className="empty">No systems in this farm yet.</div>}

      <div className="flo-grid">
        {ordered.map((s) => (
          <SystemLayoutCard key={s.id} system={s} onOpen={() => setActiveId(s.id)} />
        ))}
      </div>
    </div>
  )
}

function SystemLayoutCard({ system, onOpen }: { system: System; onOpen: () => void }) {
  const id = system.id
  const { data: tanks = [], isLoading: l1 } = useQuery({ queryKey: ['fish-inventory', id], queryFn: () => fetchFishInventory(id) })
  const { data: beds = [], isLoading: l2 } = useQuery({ queryKey: ['grow-bed-configs', id], queryFn: () => fetchGrowBedConfigs(id) })
  const { data: batches = [] } = useQuery({ queryKey: ['batches', id], queryFn: () => fetchBatches(id) })
  const { data: crops = [] } = useQuery({ queryKey: ['crop-options', id], queryFn: () => fetchCropOptions(id) })

  const densityByCrop = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of crops) { const d = plantsPerM2FromSpacing(c.plant_spacing_cm); if (d) m.set(c.value, d) }
    return m
  }, [crops])

  const bedViews = useMemo(() => buildBedViews(beds, batches, densityByCrop), [beds, batches, densityByCrop])
  const sortedTanks = useMemo(() => [...tanks].sort((a, b) => (a.tank_number ?? 0) - (b.tank_number ?? 0)), [tanks])

  const totalFish = tanks.reduce((n, t) => n + (t.current_count ?? 0), 0)
  const plantsGrowing = bedViews.reduce((n, b) => n + b.planted, 0)
  const loading = l1 || l2

  // Tank fill band by density vs its max (green → amber → red).
  const bandFor = (t: (typeof sortedTanks)[number]) => {
    const dens = t.density_kg_m3 ?? (tankM3(t) > 0 && t.biomass_kg != null ? t.biomass_kg / tankM3(t) : 0)
    const max = tankMaxDensity(t)
    const pct = max > 0 ? dens / max : 0
    return pct >= 0.9 ? 'bad' : pct >= 0.75 ? 'warn' : 'ok'
  }

  return (
    <button type="button" className="flo-card" onClick={onOpen} aria-label={`Open ${system.system_name} layout`}>
      <div className="flo-head">
        <span className="flo-name">{system.system_name}</span>
        <span className="flo-open">Open ↗</span>
      </div>
      <div className="flo-metrics">
        <span>{totalFish.toLocaleString()} fish</span>
        <span>·</span>
        <span>{tanks.length} tanks</span>
        <span>·</span>
        <span>{beds.length} beds</span>
        <span>·</span>
        <span>{plantsGrowing.toLocaleString()} plants</span>
      </div>

      {loading ? (
        <span className="flo-muted">Loading…</span>
      ) : (
        <>
          {sortedTanks.length > 0 && (
            <div className="flo-tanks">
              {sortedTanks.map((t) => (
                <span key={t.fish_tank_id} className={`flo-tank ${bandFor(t)}`} title={`Tank ${t.tank_number} · ${t.current_count ?? 0} fish`}>
                  {t.tank_number}
                </span>
              ))}
            </div>
          )}

          {bedViews.length > 0 && (
            <div className="flo-beds">
              {bedViews.map((bv) => (
                <span key={bv.bed.id} className="flo-bed" title={`${bv.bed.bed_name || `Bed ${bv.bed.bed_number}`} · ${bv.planted} plants · ${bv.pct}%`}>
                  {bv.segments.length > 0 ? (
                    bv.segments.map((s, i) => (
                      <span key={i} className="flo-bed-seg" style={{ width: `${Math.max(2, (s.area / bv.areaM2) * 100)}%`, background: s.color }} />
                    ))
                  ) : null}
                </span>
              ))}
            </div>
          )}

          {sortedTanks.length === 0 && bedViews.length === 0 && <span className="flo-muted">No tanks or beds configured.</span>}
        </>
      )}
    </button>
  )
}
