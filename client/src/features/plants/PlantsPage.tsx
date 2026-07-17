import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchAllocations, prettyCrop, type Allocation } from './api'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import './plants.css'

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  )
}

function bedGroups(allocations: Allocation[]) {
  const map = new Map<number, { bedName: string; bedType: string; items: Allocation[] }>()
  for (const a of allocations) {
    const g = map.get(a.grow_bed_id) ?? { bedName: a.bed_name ?? `Bed ${a.grow_bed_id}`, bedType: a.bed_type ?? '', items: [] }
    g.items.push(a)
    map.set(a.grow_bed_id, g)
  }
  return [...map.values()].sort((a, b) => a.bedName.localeCompare(b.bedName))
}

export function PlantsPage() {
  const { activeId, activeSystem } = useSystems()
  const { data: allocations = [], isLoading, isError } = useQuery({
    queryKey: ['allocations', activeId],
    queryFn: () => fetchAllocations(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see its plants.</div>
  if (isLoading) return <div className="empty">Loading plants…</div>
  if (isError) return <div className="empty">Could not load plant data.</div>

  const active = allocations.filter((a) => (a.status ?? 'active') === 'active')
  if (active.length === 0) return <div className="empty">No active plantings in this system yet.</div>

  const totalPlants = active.reduce((n, a) => n + (a.plants_planted ?? 0), 0)
  const crops = new Set(active.map((a) => a.crop_type))
  const groups = bedGroups(active)

  return (
    <div>
      <div className="dash-head">
        <h1>Plants</h1>
        <span className="dash-sub">{activeSystem?.system_name} · {active.length} plantings</span>
      </div>

      <h2 className="section-title">Overview</h2>
      <div className="metric-grid">
        <Stat label="Plants Growing" value={totalPlants.toLocaleString()} />
        <Stat label="Crop Types" value={String(crops.size)} />
        <Stat label="Beds Planted" value={String(groups.length)} />
      </div>

      <h2 className="section-title">By grow bed</h2>
      <div className="tank-grid">
        {groups.map((g) => (
          <div className="tank-card" key={g.bedName}>
            <div className="tank-head">
              <span className="tank-name">{g.bedName}</span>
              {g.bedType && <span className="tank-type">{g.bedType}</span>}
            </div>
            <div className="crop-list">
              {g.items
                .slice()
                .sort((a, b) => (b.plants_planted ?? 0) - (a.plants_planted ?? 0))
                .map((a) => (
                  <div className="crop-row" key={a.id}>
                    <div className="crop-main">
                      <span className="crop-name">{prettyCrop(a.crop_type)}</span>
                      {a.date_planted && (
                        <span className="crop-date">planted {new Date(a.date_planted).toLocaleDateString()}</span>
                      )}
                    </div>
                    <div className="crop-nums">
                      <b>{(a.plants_planted ?? 0).toLocaleString()}</b>
                      <span>{a.percentage_allocated != null ? `${a.percentage_allocated}%` : ''}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
