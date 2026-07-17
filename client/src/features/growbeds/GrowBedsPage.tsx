import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchGrowBeds } from './api'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import './growbeds.css'

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

export function GrowBedsPage() {
  const { activeId, activeSystem } = useSystems()
  const { data: beds = [], isLoading, isError } = useQuery({
    queryKey: ['grow-beds', activeId],
    queryFn: () => fetchGrowBeds(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see its grow beds.</div>
  if (isLoading) return <div className="empty">Loading grow beds…</div>
  if (isError) return <div className="empty">Could not load grow beds.</div>
  if (beds.length === 0) return <div className="empty">No grow beds configured for this system yet.</div>

  const totalArea = beds.reduce((n, b) => n + (b.equivalent_m2 ?? 0), 0)
  const avgUtil = beds.length ? beds.reduce((n, b) => n + (b.total_allocated ?? 0), 0) / beds.length : 0

  return (
    <div>
      <div className="dash-head">
        <h1>Grow Beds</h1>
        <span className="dash-sub">{activeSystem?.system_name} · {beds.length} beds</span>
      </div>

      <h2 className="section-title">Overview</h2>
      <div className="metric-grid">
        <Stat label="Beds" value={String(beds.length)} />
        <Stat label="Total Grow Area" value={totalArea.toFixed(1)} unit="m²" />
        <Stat label="Avg Utilization" value={avgUtil.toFixed(0)} unit="%" />
      </div>

      <h2 className="section-title">Beds</h2>
      <div className="tank-grid">
        {beds
          .slice()
          .sort((a, b) => (a.bed_name ?? '').localeCompare(b.bed_name ?? ''))
          .map((b) => {
            const used = Math.max(0, Math.min(100, b.total_allocated ?? 0))
            const full = used >= 99.5
            return (
              <div className="tank-card" key={b.id}>
                <div className="tank-head">
                  <span className="tank-name">{b.bed_name ?? `Bed ${b.id}`}</span>
                  {b.bed_type && <span className="tank-type">{b.bed_type}</span>}
                </div>
                <div className="bed-area">{(b.equivalent_m2 ?? 0).toFixed(1)} m² grow area</div>
                <div className="util">
                  <div className="util-bar">
                    <div className={`util-fill ${full ? 'full' : ''}`} style={{ width: `${used}%` }} />
                  </div>
                  <div className="util-legend">
                    <span>{used.toFixed(0)}% allocated</span>
                    <span>{(b.available_percentage ?? 0).toFixed(0)}% free</span>
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}
