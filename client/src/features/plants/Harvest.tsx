import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useSystems } from '../systems/SystemContext'
import { fetchBatches, isOverdue, overdueDays, type Batch, type BatchStatus } from './batches'
import { fetchPlantGrowth, isHarvestRow, deletePlantEntry, type PlantRow } from './plantGrowth'
import { fetchGrowBeds } from '../growbeds/api'
import { prettyCrop } from './api'
import { HarvestModal } from './HarvestModal'
import { EditEntryModal } from './EditEntryModal'
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
const RANK: Record<BatchStatus, number> = { ready: 0, approaching: 1, growing: 2, harvested: 3 }

export function Harvest() {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [harvesting, setHarvesting] = useState<Batch | null>(null)
  const [editing, setEditing] = useState<PlantRow | null>(null)
  const [confirmDel, setConfirmDel] = useState<PlantRow | null>(null)
  const [visibleHistory, setVisibleHistory] = useState(10)

  const { data: batches = [] } = useQuery({ queryKey: ['plant-batches', activeId], queryFn: () => fetchBatches(activeId as string), enabled: !!activeId })
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: ['plant-growth', activeId], queryFn: () => fetchPlantGrowth(activeId as string), enabled: !!activeId })
  const { data: beds = [] } = useQuery({ queryKey: ['grow-beds', activeId], queryFn: () => fetchGrowBeds(activeId as string), enabled: !!activeId })

  const del = useMutation({
    mutationFn: (r: PlantRow) => deletePlantEntry(activeId as string, r.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      qc.invalidateQueries({ queryKey: ['plant-growth'] })
      setConfirmDel(null)
    },
  })

  if (!activeId) return <div className="empty">Select a system to record harvests.</div>
  if (isLoading) return <div className="empty">Loading…</div>
  if (isError) return <div className="empty">Could not load harvest data.</div>

  const bedName = (id: number | null | undefined) => beds.find((b) => b.id === id)?.bed_name ?? (id != null ? `Bed ${id}` : '—')
  // Overdue batches (a week+ past harvest date) get their own urgent section.
  const overdue = batches
    .filter((b) => isOverdue(b))
    .sort((a, b) => (overdueDays(b) ?? 0) - (overdueDays(a) ?? 0))
  // Surface batches at or near maturity here; any other batch can be harvested
  // from its card on the Plantings tab. Overdue ones move up to their section.
  const harvestable = batches
    .filter((b) => b.remaining > 0 && (b.status === 'ready' || b.status === 'approaching') && !isOverdue(b))
    .sort((a, b) => RANK[a.status] - RANK[b.status] || (b.age_days ?? 0) - (a.age_days ?? 0))
  // Most recent harvests first; paged 10 at a time via "Load more".
  const history = rows
    .filter(isHarvestRow)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  const shownHistory = history.slice(0, visibleHistory)

  return (
    <div>
      {overdue.length > 0 && (
        <>
          <h2 className="section-title overdue-title" style={{ marginTop: 0 }}>Overdue <span className="overdue-count">{overdue.length}</span></h2>
          <div className="crop-list ready-list">
            {overdue.map((b) => (
              <div className="crop-row overdue-row" key={b.batch_id}>
                <div className="crop-main">
                  <span className="crop-name">
                    {prettyCrop(b.crop_type)}
                    <span className="batch-badge overdue">{overdueDays(b)}d overdue</span>
                  </span>
                  <span className="crop-date">{b.seed_variety ? `${b.seed_variety} · ` : ''}{b.bed_name ?? `Bed ${b.bed_number ?? '—'}`} · {b.remaining} plants · {b.age_days ?? '—'}d old</span>
                </div>
                <button className="row-btn" onClick={() => setHarvesting(b)}>Harvest</button>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title" style={{ marginTop: overdue.length > 0 ? undefined : 0 }}>Ready to harvest</h2>
      {harvestable.length === 0 ? (
        <div className="empty">No batches at maturity yet. You can harvest any batch from its card on the Plantings tab.</div>
      ) : (
        <div className="crop-list ready-list">
          {harvestable.map((b) => {
            const s = STATUS[b.status] ?? STATUS.growing
            return (
              <div className="crop-row" key={b.batch_id}>
                <div className="crop-main">
                  <span className="crop-name">
                    {prettyCrop(b.crop_type)}
                    <span className={`batch-badge ${s.cls}`}>{s.label}</span>
                  </span>
                  <span className="crop-date">{b.seed_variety ? `${b.seed_variety} · ` : ''}{b.bed_name ?? `Bed ${b.bed_number ?? '—'}`} · {b.remaining} plants · {b.age_days ?? '—'}d old</span>
                </div>
                <button className="row-btn" onClick={() => setHarvesting(b)}>Harvest</button>
              </div>
            )
          })}
        </div>
      )}

      <h2 className="section-title">Harvest history</h2>
      {history.length === 0 ? (
        <div className="empty">No harvests recorded yet.</div>
      ) : (
        <div className="wq-table-wrap">
          <table className="wq-table op-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Crop</th>
                <th>Variety</th>
                <th>Bed</th>
                <th>Plants</th>
                <th>Weight</th>
                <th>Quality</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shownHistory.map((r) => (
                <tr key={r.id}>
                  <td>{r.date ? new Date(`${r.date.slice(0, 10)}T12:00:00`).toLocaleDateString() : '—'}</td>
                  <td className="op-text">{r.crop_type ? prettyCrop(r.crop_type) : '—'}</td>
                  <td className="op-text">{r.seed_variety ?? '—'}</td>
                  <td className="op-text">{bedName(r.grow_bed_id)}</td>
                  <td>{r.plants_harvested ?? 0}</td>
                  <td>{r.harvest_weight != null && r.harvest_weight > 0 ? `${(r.harvest_weight / 1000).toFixed(2)} kg` : '—'}</td>
                  <td className="op-text">{r.health ?? '—'}</td>
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => setEditing(r)}>Edit</button>
                    <button className="link-btn danger" onClick={() => setConfirmDel(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length > shownHistory.length && (
            <div className="load-more-row">
              <button type="button" className="ghost" onClick={() => setVisibleHistory((n) => n + 10)}>
                Load more ({history.length - shownHistory.length} older)
              </button>
            </div>
          )}
        </div>
      )}

      {harvesting && <HarvestModal batch={harvesting} onClose={() => setHarvesting(null)} />}
      {editing && <EditEntryModal row={editing} onClose={() => setEditing(null)} />}
      {confirmDel && (
        <Modal title="Delete harvest record" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete this {confirmDel.crop_type ? prettyCrop(confirmDel.crop_type) : ''} harvest from {confirmDel.date?.slice(0, 10)}? This can't be undone.
          </p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
