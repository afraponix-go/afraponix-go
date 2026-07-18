import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchBatches, type Batch } from './batches'
import { prettyCrop } from './api'
import { fetchGrowBeds } from '../growbeds/api'
import { Stat } from '../fish/fishShared'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import './plants.css'

function cropBreakdown(active: Batch[]) {
  const map = new Map<string, { crop: string; plants: number; batches: number }>()
  for (const b of active) {
    const g = map.get(b.crop_type) ?? { crop: b.crop_type, plants: 0, batches: 0 }
    g.plants += b.remaining
    g.batches += 1
    map.set(b.crop_type, g)
  }
  return [...map.values()].sort((a, b) => b.plants - a.plants)
}

export function PlantsOverview() {
  const { activeId } = useSystems()
  const { data: batches = [], isLoading, isError } = useQuery({
    queryKey: ['plant-batches', activeId],
    queryFn: () => fetchBatches(activeId as string),
    enabled: !!activeId,
  })
  const { data: beds = [] } = useQuery({
    queryKey: ['grow-beds', activeId],
    queryFn: () => fetchGrowBeds(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see its plants.</div>
  if (isLoading) return <div className="empty">Loading plants…</div>
  if (isError) return <div className="empty">Could not load plant data.</div>
  if (batches.length === 0) return <div className="empty">No plantings recorded for this system yet.</div>

  const active = batches.filter((b) => b.status !== 'harvested' && b.remaining > 0)
  const ready = batches.filter((b) => b.status === 'ready')
  const plantsGrowing = active.reduce((n, b) => n + b.remaining, 0)
  const totalHarvestKg = batches.reduce((n, b) => n + b.harvest_weight_g, 0) / 1000
  const plantsHarvested = batches.reduce((n, b) => n + b.harvested, 0)
  const crops = new Set(active.map((b) => b.crop_type))
  const avgUtil = beds.length ? beds.reduce((n, b) => n + (b.total_allocated ?? 0), 0) / beds.length : 0
  const groups = cropBreakdown(active)
  const maxPlants = groups.length ? groups[0].plants : 0

  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Overview</h2>
      <div className="metric-grid">
        <Stat label="Plants Growing" value={plantsGrowing.toLocaleString()} sub={`${crops.size} crop ${crops.size === 1 ? 'type' : 'types'}`} />
        <Stat label="Active Batches" value={String(active.length)} sub={`${batches.length} total`} />
        <Stat label="Ready to Harvest" value={String(ready.length)} sub={ready.length ? 'batches at maturity' : 'none yet'} />
        <Stat label="Total Harvested" value={totalHarvestKg >= 1 ? totalHarvestKg.toFixed(1) : totalHarvestKg.toFixed(2)} unit="kg" sub={`${plantsHarvested.toLocaleString()} plants`} />
        <Stat label="Grow Beds" value={String(beds.length)} sub={`${avgUtil.toFixed(0)}% allocated`} />
        <Stat label="Crop Varieties" value={String(crops.size)} />
      </div>

      {ready.length > 0 && (
        <>
          <h2 className="section-title">Ready to harvest</h2>
          <div className="crop-list ready-list">
            {ready
              .slice()
              .sort((a, b) => (b.age_days ?? 0) - (a.age_days ?? 0))
              .map((b) => {
                const over = b.age_days != null && b.days_to_harvest != null ? b.age_days - b.days_to_harvest : null
                return (
                  <div className="crop-row" key={b.batch_id}>
                    <div className="crop-main">
                      <span className="crop-name">{prettyCrop(b.crop_type)}</span>
                      <span className="crop-date">
                        {b.bed_name ?? `Bed ${b.bed_number ?? '—'}`}
                        {over != null && over > 0 ? ` · ${over}d overdue` : ' · due now'}
                      </span>
                    </div>
                    <div className="crop-nums">
                      <b>{b.remaining.toLocaleString()}</b>
                      <span>{b.age_days ?? '—'}d old</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </>
      )}

      <h2 className="section-title">Plants by crop</h2>
      <div className="crop-bars">
        {groups.map((g) => (
          <div className="crop-bar-row" key={g.crop}>
            <div className="crop-bar-head">
              <span className="crop-name">{prettyCrop(g.crop)}</span>
              <span className="crop-bar-nums">
                <b>{g.plants.toLocaleString()}</b> · {g.batches} {g.batches === 1 ? 'batch' : 'batches'}
              </span>
            </div>
            <div className="density-bar">
              <div className="density-fill" style={{ width: `${maxPlants ? (g.plants / maxPlants) * 100 : 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
