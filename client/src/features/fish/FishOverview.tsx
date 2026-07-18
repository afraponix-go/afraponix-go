import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, maxDensityForSpecies, type FishTank } from './api'
import { fetchFeedingLog } from './feeding'
import { TankActionModal, type TankAction } from './TankActionModal'
import { sum, fmt, timeAgo, monthlyFeed, feedLabel, Stat } from './fishShared'
import '../dashboard/dashboard.css'
import './fish.css'

export function FishOverview() {
  const { activeId } = useSystems()
  const [modal, setModal] = useState<{ tank: FishTank; action: TankAction } | null>(null)
  const { data: tanks = [], isLoading, isError } = useQuery({
    queryKey: ['fish-inventory', activeId],
    queryFn: () => fetchFishInventory(activeId as string),
    enabled: !!activeId,
  })
  const { data: feedingLog = [] } = useQuery({
    queryKey: ['feeding-log', activeId],
    queryFn: () => fetchFeedingLog(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see its fish tanks.</div>
  if (isLoading) return <div className="empty">Loading fish tanks…</div>
  if (isError) return <div className="empty">Could not load fish data.</div>
  if (tanks.length === 0) return <div className="empty">No fish tanks configured for this system yet.</div>

  const totalFish = sum(tanks, 'current_count')
  const totalBiomass = sum(tanks, 'biomass_kg')
  const totalVolumeM3 = sum(tanks, 'size_m3')
  const systemDensity = totalVolumeM3 > 0 ? totalBiomass / totalVolumeM3 : 0
  const systemMax = Math.max(25, ...tanks.map((t) => maxDensityForSpecies(t.tank_fish_type)))
  const { thisMonth, trend, lastFedMs } = monthlyFeed(feedingLog)
  const feed = feedLabel(thisMonth)

  return (
    <div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Overview</h2>
      <div className="metric-grid">
        <Stat label="Total Fish" value={fmt(totalFish)} sub={`Across ${tanks.length} tanks`} />
        <Stat label="Current Density" value={fmt(systemDensity, 1)} unit="kg/m³" sub={`Max ${systemMax} kg/m³`}>
          <div className="density-bar"><div className="density-fill" style={{ width: `${Math.min(100, (systemDensity / systemMax) * 100)}%` }} /></div>
        </Stat>
        <Stat label="Feed This Month" value={feed.value} unit={feed.unit} sub={trend != null ? `${trend >= 0 ? '+' : ''}${trend}% vs last month` : 'no prior month'} />
        <Stat label="Last Fed" value={lastFedMs ? timeAgo(lastFedMs) : '—'} sub={lastFedMs ? 'Feed regularly for optimal health' : 'No feeding logged'} />
      </div>

      <h2 className="section-title">Tanks</h2>
      <div className="tank-grid">
        {tanks
          .slice()
          .sort((a, b) => a.tank_number - b.tank_number)
          .map((t) => {
            const max = maxDensityForSpecies(t.tank_fish_type)
            const dens = t.density_kg_m3 ?? 0
            const pct = max > 0 ? (dens / max) * 100 : 0
            const health = pct >= 100 ? { label: 'Overstocked', cls: 'warn' } : pct >= 85 ? { label: 'Near limit', cls: 'watch' } : { label: 'Healthy', cls: 'ok' }
            return (
              <div className="tank-card" key={t.fish_tank_id}>
                <div className="tank-head">
                  <span className="tank-name">
                    Tank {t.tank_number}
                    <span className={`tank-health ${health.cls}`}>{health.label}</span>
                  </span>
                  <span className="tank-type">{t.tank_fish_type ?? 'fish'}</span>
                </div>
                <div className="tank-rows">
                  <div><span>Count</span><b>{fmt(t.current_count)}</b></div>
                  <div><span>Avg weight</span><b>{fmt(t.average_weight)} g</b></div>
                  <div><span>Biomass</span><b>{fmt(t.biomass_kg, 1)} kg</b></div>
                  <div><span>Volume</span><b>{fmt(t.volume_liters)} L</b></div>
                </div>
                <div className="tank-density">
                  <div className="tank-density-top"><span>Density</span><b>{fmt(dens, 2)} kg/m³</b></div>
                  <div className="density-bar"><div className={`density-fill ${health.cls}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                  <div className="tank-density-rec">Recommended max: {max} kg/m³</div>
                </div>
                <div className="tank-actions">
                  <button className="tank-action-btn" onClick={() => setModal({ tank: t, action: 'add' })}>+ Add</button>
                  <button className="tank-action-btn danger" onClick={() => setModal({ tank: t, action: 'mortality' })}>− Loss</button>
                  <button className="tank-action-btn" onClick={() => setModal({ tank: t, action: 'weight' })}>Weight</button>
                </div>
              </div>
            )
          })}
      </div>

      {modal && activeId && (
        <TankActionModal systemId={activeId} tank={modal.tank} action={modal.action} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
