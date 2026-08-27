import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { useSystems, SystemScope } from '../systems/SystemContext'
import type { System } from '../systems/api'
import { fetchBatches, isOverdue, overdueDays, type Batch, type BatchStatus } from './batches'
import { fetchPlantGrowth, isHarvestRow, deletePlantEntry, type PlantRow } from './plantGrowth'
import { fetchGrowBeds, type GrowBed } from '../growbeds/api'
import { prettyCrop } from './api'
import { HarvestModal } from './HarvestModal'
import { EditEntryModal } from './EditEntryModal'
import '../dashboard/dashboard.css'
import '../fish/fish.css'
import '../water/water.css'
import '../systems/farmview.css'
import './plants.css'

const STATUS: Record<BatchStatus, { label: string; cls: string }> = {
  growing: { label: 'Growing', cls: 'growing' },
  approaching: { label: 'Approaching', cls: 'approaching' },
  ready: { label: 'Ready', cls: 'ready' },
  harvested: { label: 'Harvested', cls: 'harvested' },
}
const RANK: Record<BatchStatus, number> = { ready: 0, approaching: 1, growing: 2, harvested: 3 }

type ReadyItem = { system: System; batch: Batch }
type HistoryItem = { system: System; row: PlantRow; beds: GrowBed[] }
type SysGroup = { system: System; items: ReadyItem[] }
type CropGroup = { crop: string; total: number; batches: number; systems: SysGroup[] }

// Group batches by crop (product), then by system within each crop. Crops are
// ordered by total plant count, systems by name.
function groupByCropThenSystem(items: ReadyItem[]): CropGroup[] {
  const byCrop = new Map<string, ReadyItem[]>()
  for (const it of items) {
    const list = byCrop.get(it.batch.crop_type)
    if (list) list.push(it)
    else byCrop.set(it.batch.crop_type, [it])
  }
  const groups: CropGroup[] = []
  for (const [crop, list] of byCrop) {
    const bySys = new Map<string, SysGroup>()
    for (const it of list) {
      const sg = bySys.get(it.system.id)
      if (sg) sg.items.push(it)
      else bySys.set(it.system.id, { system: it.system, items: [it] })
    }
    const systems = [...bySys.values()].sort((a, b) => a.system.system_name.localeCompare(b.system.system_name, undefined, { numeric: true }))
    groups.push({ crop, total: list.reduce((n, it) => n + it.batch.remaining, 0), batches: list.length, systems })
  }
  return groups.sort((a, b) => b.total - a.total)
}

// Farm-mode Harvest: instead of a section per system, roll every system's
// batches up into one "Ready to harvest" list and one "Harvest history" table,
// each row tagged with its system. Actions run against the right system.
export function HarvestFarm() {
  const { systems, activeFarm } = useSystems()
  const qc = useQueryClient()
  const ordered = useMemo(
    () => [...systems].sort((a, b) => a.system_name.localeCompare(b.system_name, undefined, { numeric: true })),
    [systems],
  )

  const batchQs = useQueries({ queries: ordered.map((s) => ({ queryKey: ['plant-batches', s.id], queryFn: () => fetchBatches(s.id) })) })
  const growthQs = useQueries({ queries: ordered.map((s) => ({ queryKey: ['plant-growth', s.id], queryFn: () => fetchPlantGrowth(s.id) })) })
  const bedsQs = useQueries({ queries: ordered.map((s) => ({ queryKey: ['grow-beds', s.id], queryFn: () => fetchGrowBeds(s.id) })) })

  const [harvesting, setHarvesting] = useState<ReadyItem | null>(null)
  const [editing, setEditing] = useState<PlantRow | null>(null)
  const [confirmDel, setConfirmDel] = useState<HistoryItem | null>(null)
  const [visibleHistory, setVisibleHistory] = useState(10)

  const del = useMutation({
    mutationFn: (it: HistoryItem) => deletePlantEntry(it.system.id, it.row.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      qc.invalidateQueries({ queryKey: ['plant-growth'] })
      setConfirmDel(null)
    },
  })

  const loading = batchQs.some((q) => q.isLoading) || growthQs.some((q) => q.isLoading)

  // Overdue (a week+ past harvest) and ready/approaching batches across the farm.
  const overdue: ReadyItem[] = []
  const ready: ReadyItem[] = []
  ordered.forEach((system, i) => {
    for (const b of batchQs[i].data ?? []) {
      if (isOverdue(b)) overdue.push({ system, batch: b })
      else if (b.remaining > 0 && (b.status === 'ready' || b.status === 'approaching')) ready.push({ system, batch: b })
    }
  })
  overdue.sort((a, b) => (overdueDays(b.batch) ?? 0) - (overdueDays(a.batch) ?? 0))
  ready.sort((a, b) => RANK[a.batch.status] - RANK[b.batch.status] || (b.batch.age_days ?? 0) - (a.batch.age_days ?? 0))

  // Harvest history across the farm, newest first.
  const history: HistoryItem[] = []
  ordered.forEach((system, i) => {
    const beds = bedsQs[i].data ?? []
    for (const r of (growthQs[i].data ?? []).filter(isHarvestRow)) history.push({ system, row: r, beds })
  })
  history.sort((a, b) => (b.row.date ?? '').localeCompare(a.row.date ?? ''))
  const shownHistory = history.slice(0, visibleHistory)

  const bedName = (beds: GrowBed[], id: number | null | undefined) =>
    beds.find((x) => x.id === id)?.bed_name ?? (id != null ? `Bed ${id}` : '—')

  // Grouped rendering: crop (product) → system → its batches. Collapses the
  // repetitive "System X · Lettuce" rows into one crop heading per product.
  const renderGroups = (items: ReadyItem[], overdue: boolean) => (
    <div className="harvest-groups">
      {groupByCropThenSystem(items).map((g) => (
        <div className="harvest-group" key={g.crop}>
          <div className="harvest-group-head">
            <span className="harvest-group-name">{prettyCrop(g.crop)}</span>
            <span className="harvest-group-meta">{g.total.toLocaleString()} plants · {g.batches} {g.batches === 1 ? 'batch' : 'batches'}</span>
          </div>
          {g.systems.map((sg) => (
            <div className="harvest-sysgroup" key={sg.system.id}>
              <div className="harvest-sysgroup-head">{sg.system.system_name}</div>
              <div className="crop-list ready-list">
                {sg.items.map((it) => {
                  const st = STATUS[it.batch.status] ?? STATUS.growing
                  return (
                    <div className={`crop-row${overdue ? ' overdue-row' : ''}`} key={`${it.system.id}-${it.batch.batch_id}`}>
                      <div className="crop-main">
                        <span className="crop-name">
                          {it.batch.seed_variety ?? prettyCrop(it.batch.crop_type)}
                          {overdue
                            ? <span className="batch-badge overdue">{overdueDays(it.batch)}d overdue</span>
                            : <span className={`batch-badge ${st.cls}`}>{st.label}</span>}
                        </span>
                        <span className="crop-date">{it.batch.bed_name ?? `Bed ${it.batch.bed_number ?? '—'}`} · {it.batch.remaining} plants · {it.batch.age_days ?? '—'}d old</span>
                      </div>
                      <button className="row-btn" onClick={() => setHarvesting(it)}>Harvest</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className="fm">
      <div className="fm-bar">
        <div className="fm-bar-title">
          <span className="fm-eyebrow">All systems</span>
          <b>{activeFarm?.name ?? 'Farm'}</b>
        </div>
        {overdue.length > 0 && <div className="fm-stat"><b>{overdue.length}</b><span>Overdue</span></div>}
        <div className="fm-stat"><b>{ready.length}</b><span>Batches ready</span></div>
        <div className="fm-stat"><b>{history.length}</b><span>Harvest records</span></div>
      </div>

      {overdue.length > 0 && (
        <>
          <h2 className="section-title overdue-title" style={{ marginTop: 18 }}>Overdue <span className="overdue-count">{overdue.length}</span></h2>
          {renderGroups(overdue, true)}
        </>
      )}

      <h2 className="section-title" style={{ marginTop: 18 }}>Ready to harvest</h2>
      {loading ? (
        <div className="empty">Loading…</div>
      ) : ready.length === 0 ? (
        <div className="empty">No batches at maturity across the farm. Any batch can be harvested from its card on the Plantings tab.</div>
      ) : (
        renderGroups(ready, false)
      )}

      <h2 className="section-title">Harvest history</h2>
      {history.length === 0 ? (
        <div className="empty">No harvests recorded across the farm yet.</div>
      ) : (
        <div className="wq-table-wrap">
          <table className="wq-table op-table">
            <thead>
              <tr>
                <th>Date</th><th>System</th><th>Crop</th><th>Variety</th><th>Bed</th><th>Plants</th><th>Weight</th><th>Quality</th><th></th>
              </tr>
            </thead>
            <tbody>
              {shownHistory.map((it) => {
                const r = it.row
                return (
                  <tr key={`${it.system.id}-${r.id}`}>
                    <td>{r.date ? new Date(`${r.date.slice(0, 10)}T12:00:00`).toLocaleDateString() : '—'}</td>
                    <td className="op-text">{it.system.system_name}</td>
                    <td className="op-text">{r.crop_type ? prettyCrop(r.crop_type) : '—'}</td>
                    <td className="op-text">{r.seed_variety ?? '—'}</td>
                    <td className="op-text">{bedName(it.beds, r.grow_bed_id)}</td>
                    <td>{r.plants_harvested ?? 0}</td>
                    <td>{r.harvest_weight != null && r.harvest_weight > 0 ? `${(r.harvest_weight / 1000).toFixed(2)} kg` : '—'}</td>
                    <td className="op-text">{r.health ?? '—'}</td>
                    <td className="row-actions">
                      <button className="link-btn" onClick={() => setEditing(r)}>Edit</button>
                      <button className="link-btn danger" onClick={() => setConfirmDel(it)}>Delete</button>
                    </td>
                  </tr>
                )
              })}
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

      {/* HarvestModal records against the active system, so scope it to the row's. */}
      {harvesting && (
        <SystemScope systemId={harvesting.system.id}>
          <HarvestModal batch={harvesting.batch} onClose={() => setHarvesting(null)} />
        </SystemScope>
      )}
      {editing && <EditEntryModal row={editing} onClose={() => setEditing(null)} />}
      {confirmDel && (
        <Modal title="Delete harvest record" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete this {confirmDel.row.crop_type ? prettyCrop(confirmDel.row.crop_type) : ''} harvest ({confirmDel.system.system_name}) from {confirmDel.row.date?.slice(0, 10)}? This can't be undone.
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
