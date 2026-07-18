import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, type FishTank } from './api'
import { TankActionModal, type TankAction } from './TankActionModal'
import { FeedingModal } from './FeedingModal'
import { fetchFeedingLog } from './feeding'
import '../dashboard/dashboard.css'
import '../water/water.css'
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
  const [modal, setModal] = useState<{ tank: FishTank; action: TankAction } | null>(null)
  const [showFeeding, setShowFeeding] = useState(false)
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
              <div className="tank-actions">
                <button className="tank-action-btn" onClick={() => setModal({ tank: t, action: 'add' })}>+ Add</button>
                <button className="tank-action-btn danger" onClick={() => setModal({ tank: t, action: 'mortality' })}>− Loss</button>
                <button className="tank-action-btn" onClick={() => setModal({ tank: t, action: 'weight' })}>Weight</button>
              </div>
            </div>
          ))}
      </div>

      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Feeding</h2>
        <button className="btn feed-btn" onClick={() => setShowFeeding(true)}>+ Log feeding</button>
      </div>
      {feedingLog.length === 0 ? (
        <div className="empty">No feeding logged yet.</div>
      ) : (
        <div className="wq-table-wrap">
          <table className="wq-table op-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Tank</th>
                <th>Feed (g)</th>
                <th>Type</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {feedingLog.map((r, i) => {
                const tankNo = tanks.find((t) => t.fish_tank_id === r.fish_tank_id)?.tank_number
                return (
                  <tr key={r.id ?? i}>
                    <td>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                    <td>{tankNo != null ? `Tank ${tankNo}` : `#${r.fish_tank_id ?? '—'}`}</td>
                    <td>{r.feed_consumption ?? '—'}</td>
                    <td className="op-text">{r.feed_type || '—'}</td>
                    <td className="op-text">{r.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && activeId && (
        <TankActionModal systemId={activeId} tank={modal.tank} action={modal.action} onClose={() => setModal(null)} />
      )}
      {showFeeding && activeId && tanks.length > 0 && (
        <FeedingModal systemId={activeId} tanks={tanks} previousLog={feedingLog} onClose={() => setShowFeeding(false)} />
      )}
    </div>
  )
}
