import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchBatches, type Batch, type BatchStatus } from './batches'
import { prettyCrop } from './api'
import { NewPlantingModal } from './NewPlantingModal'
import { MoveBatchModal } from './MoveBatchModal'
import { HarvestModal } from './HarvestModal'
import { ViewToggle, useViewMode } from '../../components/ViewToggle'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import '../water/water.css'
import './plants.css'

const STATUS: Record<BatchStatus, { label: string; cls: string }> = {
  growing: { label: 'Growing', cls: 'growing' },
  approaching: { label: 'Approaching', cls: 'approaching' },
  ready: { label: 'Ready', cls: 'ready' },
  harvested: { label: 'Harvested', cls: 'harvested' },
}

function groupByCrop(batches: Batch[]) {
  const map = new Map<string, Batch[]>()
  for (const b of batches) {
    const arr = map.get(b.crop_type) ?? []
    arr.push(b)
    map.set(b.crop_type, arr)
  }
  return [...map.entries()]
    .map(([crop, items]) => ({
      crop,
      items: items.slice().sort((a, b) => (b.age_days ?? 0) - (a.age_days ?? 0)),
      plants: items.reduce((n, b) => n + b.remaining, 0),
    }))
    .sort((a, b) => b.plants - a.plants)
}

function maturity(b: Batch): number {
  if (!b.days_to_harvest || b.age_days == null) return 0
  return Math.max(0, Math.min(100, (b.age_days / b.days_to_harvest) * 100))
}

export function Plantings() {
  const { activeId } = useSystems()
  const [view] = useViewMode()
  const [showAll, setShowAll] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [moving, setMoving] = useState<Batch | null>(null)
  const [harvesting, setHarvesting] = useState<Batch | null>(null)
  const { data: batches = [], isLoading, isError } = useQuery({
    queryKey: ['plant-batches', activeId],
    queryFn: () => fetchBatches(activeId as string),
    enabled: !!activeId,
  })

  if (!activeId) return <div className="empty">Select a system to see its plantings.</div>
  if (isLoading) return <div className="empty">Loading plantings…</div>
  if (isError) return <div className="empty">Could not load plantings.</div>

  const shown = showAll ? batches : batches.filter((b) => b.status !== 'harvested' && b.remaining > 0)
  const groups = groupByCrop(shown)

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Plantings</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="seg">
            <button className={`seg-btn ${!showAll ? 'active' : ''}`} onClick={() => setShowAll(false)}>Active</button>
            <button className={`seg-btn ${showAll ? 'active' : ''}`} onClick={() => setShowAll(true)}>All</button>
          </div>
          <ViewToggle />
          <button className="btn feed-btn" onClick={() => setShowNew(true)}>+ New planting</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="empty">{showAll ? 'No plantings recorded yet.' : 'No active plantings. Record a new planting to get started.'}</div>
      ) : view === 'list' ? (
        <div className="wq-table-wrap">
          <table className="wq-table op-table">
            <thead>
              <tr>
                <th>Bed</th>
                <th>Crop</th>
                <th>Variety</th>
                <th>Status</th>
                <th>Remaining</th>
                <th>Planted</th>
                <th>Age</th>
                <th>Maturity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.flatMap((g) => g.items).map((b) => {
                const s = STATUS[b.status] ?? STATUS.growing
                const pct = maturity(b)
                return (
                  <tr key={b.batch_id}>
                    <td className="op-text">{b.bed_name ?? `Bed ${b.bed_number ?? '—'}`}<span className="batch-id-tag block">{b.batch_id}</span></td>
                    <td className="op-text">{prettyCrop(b.crop_type)}</td>
                    <td className="op-text">{b.seed_variety ?? '—'}</td>
                    <td><span className={`batch-badge ${s.cls}`}>{s.label}</span></td>
                    <td>{b.remaining.toLocaleString()}</td>
                    <td>{b.planted.toLocaleString()}</td>
                    <td>{b.age_days ?? '—'} d</td>
                    <td>{pct.toFixed(0)}%</td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => setHarvesting(b)} disabled={b.remaining <= 0}>Harvest</button>
                      <button className="link-btn" onClick={() => setMoving(b)} disabled={b.remaining <= 0}>Move</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.crop} className="crop-section">
            <div className="crop-section-head">
              <span className="crop-name">{prettyCrop(g.crop)}</span>
              <span className="crop-section-sub">{g.plants.toLocaleString()} plants · {g.items.length} {g.items.length === 1 ? 'batch' : 'batches'}</span>
            </div>
            <div className="tank-grid">
              {g.items.map((b) => {
                const s = STATUS[b.status] ?? STATUS.growing
                const pct = maturity(b)
                return (
                  <div className="tank-card" key={b.batch_id}>
                    <div className="tank-head">
                      <span className="tank-name">
                        {b.bed_name ?? `Bed ${b.bed_number ?? '—'}`}
                        <span className={`batch-badge ${s.cls}`}>{s.label}</span>
                      </span>
                      {b.seed_variety && <span className="tank-type">{b.seed_variety}</span>}
                      <span className="batch-id-tag block">{b.batch_id}</span>
                    </div>
                    <div className="tank-rows">
                      <div><span>Remaining</span><b>{b.remaining.toLocaleString()}</b></div>
                      <div><span>Planted</span><b>{b.planted.toLocaleString()}</b></div>
                      <div><span>Age</span><b>{b.age_days ?? '—'} d</b></div>
                      <div><span>To harvest</span><b>{b.days_to_harvest ?? '—'} d</b></div>
                    </div>
                    <div className="tank-density">
                      <div className="tank-density-top"><span>Maturity</span><b>{pct.toFixed(0)}%</b></div>
                      <div className="density-bar"><div className={`density-fill ${s.cls}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                    <div className="tank-actions">
                      <button className="tank-action-btn" onClick={() => setHarvesting(b)} disabled={b.remaining <= 0}>Harvest</button>
                      <button className="tank-action-btn" onClick={() => setMoving(b)} disabled={b.remaining <= 0}>Move</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showNew && <NewPlantingModal onClose={() => setShowNew(false)} />}
      {moving && <MoveBatchModal batch={moving} onClose={() => setMoving(null)} />}
      {harvesting && <HarvestModal batch={harvesting} onClose={() => setHarvesting(null)} />}
    </div>
  )
}
