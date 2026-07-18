import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory, maxDensityForSpecies, type FishTank } from './api'
import { TankActionModal, type TankAction } from './TankActionModal'
import { FeedingModal } from './FeedingModal'
import { fetchFeedingLog, type FeedingRecord } from './feeding'
import '../dashboard/dashboard.css'
import '../water/water.css'
import './fish.css'

function sum(tanks: FishTank[], key: keyof FishTank) {
  return tanks.reduce((acc, t) => acc + (typeof t[key] === 'number' ? (t[key] as number) : 0), 0)
}

function Stat({ label, value, unit, sub, children }: { label: string; value: string; unit?: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {children}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function fmt(n: number | null, digits = 0) {
  return n == null || !Number.isFinite(n) ? '—' : n.toFixed(digits)
}

function timeAgo(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

// Feed totals for this vs last calendar month, from the feeding log.
function monthlyFeed(log: FeedingRecord[]) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const lastM = new Date(y, m - 1, 1)
  let thisMonth = 0
  let lastMonth = 0
  let lastFedMs = 0
  for (const r of log) {
    if (r.feed_consumption == null) continue
    const stamp = r.created_at ?? r.date
    if (stamp) lastFedMs = Math.max(lastFedMs, new Date(stamp).getTime())
    if (!r.date) continue
    const d = new Date(r.date)
    if (d.getFullYear() === y && d.getMonth() === m) thisMonth += r.feed_consumption
    else if (d.getFullYear() === lastM.getFullYear() && d.getMonth() === lastM.getMonth()) lastMonth += r.feed_consumption
  }
  const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null
  return { thisMonth, lastMonth, trend, lastFedMs }
}

function feedLabel(g: number): { value: string; unit: string } {
  return g >= 1000 ? { value: (g / 1000).toFixed(1), unit: 'kg' } : { value: String(Math.round(g)), unit: 'g' }
}

export function FishPage() {
  const { activeId, activeSystem } = useSystems()
  const [modal, setModal] = useState<{ tank: FishTank; action: TankAction } | null>(null)
  const [showFeeding, setShowFeeding] = useState(false)
  const [feedExpanded, setFeedExpanded] = useState(false)
  const FEED_PREVIEW = 6
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
      <div className="dash-head">
        <h1>Fish</h1>
        <span className="dash-sub">{activeSystem?.system_name} · {tanks.length} tanks</span>
      </div>

      <h2 className="section-title">Overview</h2>
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
                <div className="tank-density-top">
                  <span>Density</span>
                  <b>{fmt(dens, 2)} kg/m³</b>
                </div>
                <div className="density-bar"><div className={`density-fill ${health.cls}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                <div className="tank-density-rec">Recommended max: {max} kg/m³</div>
              </div>
              <div className="tank-actions">
                <button className="tank-action-btn" onClick={() => setModal({ tank: t, action: 'add' })}>+ Add</button>
                <button className="tank-action-btn danger" onClick={() => setModal({ tank: t, action: 'mortality' })}>− Loss</button>
                <button className="tank-action-btn" onClick={() => setModal({ tank: t, action: 'weight' })}>Weight</button>
              </div>
            </div>
          )})}
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
              {(feedExpanded ? feedingLog : feedingLog.slice(0, FEED_PREVIEW)).map((r, i) => {
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
          {feedingLog.length > FEED_PREVIEW && (
            <button className="feed-expand" onClick={() => setFeedExpanded((v) => !v)}>
              {feedExpanded ? 'Show less' : `Show all ${feedingLog.length} entries`}
            </button>
          )}
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
