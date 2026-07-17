import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, type FishTank } from './api'
import '../dashboard/dashboard.css'
import './fish.css'

function sum(tanks: FishTank[], key: keyof FishTank) {
  return tanks.reduce((acc, t) => acc + (typeof t[key] === 'number' ? (t[key] as number) : 0), 0)
}

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

function fmt(n: number | null, digits = 0) {
  return n == null || !Number.isFinite(n) ? '—' : n.toFixed(digits)
}

export function FishPage() {
  const { activeId, activeSystem } = useSystems()
  const { data: tanks = [], isLoading, isError } = useQuery({
    queryKey: ['fish-inventory', activeId],
    queryFn: () => fetchFishInventory(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see its fish tanks.</div>
  if (isLoading) return <div className="empty">Loading fish tanks…</div>
  if (isError) return <div className="empty">Could not load fish data.</div>
  if (tanks.length === 0) return <div className="empty">No fish tanks configured for this system yet.</div>

  const totalFish = sum(tanks, 'current_count')
  const totalBiomass = sum(tanks, 'biomass_kg')
  const totalVolumeM3 = sum(tanks, 'size_m3')
  const avgDensity = totalVolumeM3 > 0 ? totalBiomass / totalVolumeM3 : null

  return (
    <div>
      <div className="dash-head">
        <h1>Fish</h1>
        <span className="dash-sub">{activeSystem?.system_name} · {tanks.length} tanks</span>
      </div>

      <h2 className="section-title">Overview</h2>
      <div className="metric-grid">
        <Stat label="Total Fish" value={fmt(totalFish)} />
        <Stat label="Total Biomass" value={fmt(totalBiomass, 1)} unit="kg" />
        <Stat label="Avg Density" value={fmt(avgDensity, 2)} unit="kg/m³" />
        <Stat label="Tanks" value={String(tanks.length)} />
      </div>

      <h2 className="section-title">Tanks</h2>
      <div className="tank-grid">
        {tanks
          .slice()
          .sort((a, b) => a.tank_number - b.tank_number)
          .map((t) => (
            <div className="tank-card" key={t.fish_tank_id}>
              <div className="tank-head">
                <span className="tank-name">Tank {t.tank_number}</span>
                <span className="tank-type">{t.tank_fish_type ?? 'fish'}</span>
              </div>
              <div className="tank-rows">
                <div><span>Count</span><b>{fmt(t.current_count)}</b></div>
                <div><span>Avg weight</span><b>{fmt(t.average_weight)} g</b></div>
                <div><span>Biomass</span><b>{fmt(t.biomass_kg, 1)} kg</b></div>
                <div><span>Density</span><b>{fmt(t.density_kg_m3, 2)} kg/m³</b></div>
                <div><span>Volume</span><b>{fmt(t.volume_liters)} L</b></div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
