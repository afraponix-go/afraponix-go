import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { fetchPlantGrowth, isHarvestRow, deletePlantEntry, type PlantRow } from './plantGrowth'
import { prettyCrop } from './api'
import { EditEntryModal } from './EditEntryModal'
import type { Batch } from './batches'

type Kind = 'planting' | 'harvest' | 'transfer_in' | 'transfer_out'
const kindOf = (r: PlantRow): Kind =>
  r.growth_stage === 'transfer_out' ? 'transfer_out' : r.growth_stage === 'transfer_in' ? 'transfer_in' : isHarvestRow(r) ? 'harvest' : 'planting'

const KIND_LABEL: Record<Kind, string> = { planting: 'Planting', harvest: 'Harvest', transfer_in: 'Transfer in', transfer_out: 'Transfer out' }
const fmtDate = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString() : '—')

function summary(r: PlantRow, k: Kind): string {
  if (k === 'planting') {
    const n = r.new_seedlings || r.count || 0
    return `${n.toLocaleString()} planted${r.seed_variety ? ` · ${r.seed_variety}` : ''}${r.days_to_harvest ? ` · ${r.days_to_harvest} days to harvest` : ''}`
  }
  if (k === 'harvest') {
    const kg = r.harvest_weight != null && r.harvest_weight > 0 ? ` · ${(r.harvest_weight / 1000).toFixed(2)} kg` : ''
    return `${(r.plants_harvested ?? 0).toLocaleString()} plants harvested${kg}${r.health ? ` · ${r.health}` : ''}`
  }
  return `${Math.abs(r.new_seedlings ?? 0).toLocaleString()} plants`
}

// Every entry recorded against one batch — the planting, each harvest, and any
// transfers — so a mistake can be corrected (Edit) or removed (Delete) after
// the fact. Transfers are shown but read-only: they're tied to a batch in
// another system, so changing one here would leave the two out of step.
export function BatchHistoryModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<PlantRow | null>(null)
  const [confirmDel, setConfirmDel] = useState<PlantRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: all = [], isLoading, isError } = useQuery({ queryKey: ['plant-growth', activeId], queryFn: () => fetchPlantGrowth(activeId as string), enabled: !!activeId })
  const rows = all
    .filter((r) => r.batch_id === batch.batch_id)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || a.id - b.id)

  const del = useMutation({
    mutationFn: (r: PlantRow) => deletePlantEntry(activeId as string, r.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      qc.invalidateQueries({ queryKey: ['plant-growth'] })
      const left = rows.filter((r) => r.id !== confirmDel?.id).length
      setConfirmDel(null)
      if (left === 0) onClose() // the whole batch is gone
    },
    onError: (e) => { setConfirmDel(null); setError(e instanceof ApiError ? e.message : 'Could not delete the entry.') },
  })

  // A planting that later harvests/transfers depend on can't be removed on its
  // own — those entries would be left pointing at nothing.
  const others = (r: PlantRow) => rows.some((x) => x.id !== r.id && kindOf(x) !== 'planting')

  return (
    <>
      <Modal title={`History · ${prettyCrop(batch.crop_type)}`} onClose={onClose}>
        <p className="bh-sub">{batch.batch_id}</p>
        {error && <div className="wq-error">{error}</div>}
        {isLoading ? <div className="empty">Loading…</div> : isError ? <div className="empty">Could not load the history.</div> : rows.length === 0 ? (
          <div className="empty">No entries recorded for this batch.</div>
        ) : (
          <ul className="bh-list">
            {rows.map((r) => {
              const k = kindOf(r)
              const editable = k === 'planting' || k === 'harvest'
              return (
                <li key={r.id} className="bh-row">
                  <div className="bh-main">
                    <span className={`bh-kind ${k}`}>{KIND_LABEL[k]}</span>
                    <span className="bh-date">{fmtDate(r.date)}</span>
                  </div>
                  <div className="bh-sum">{summary(r, k)}</div>
                  {r.notes && <div className="bh-notes">{r.notes}</div>}
                  {editable ? (
                    <div className="bh-actions">
                      <button type="button" className="link-btn" onClick={() => { setError(null); setEditing(r) }}>Edit</button>
                      <button
                        type="button"
                        className="link-btn danger"
                        onClick={() => {
                          if (k === 'planting' && others(r)) return setError('This planting has harvests or transfers recorded against it. Delete those first, or edit the planting instead.')
                          setError(null)
                          setConfirmDel(r)
                        }}
                      >Delete</button>
                    </div>
                  ) : (
                    <div className="bh-note-ro">Linked to another system — can't be edited here.</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Modal>

      {editing && <EditEntryModal row={editing} onClose={() => setEditing(null)} />}
      {confirmDel && (
        <Modal title={`Delete ${KIND_LABEL[kindOf(confirmDel)].toLowerCase()}`} onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete the {KIND_LABEL[kindOf(confirmDel)].toLowerCase()} from {fmtDate(confirmDel.date)}?
            {kindOf(confirmDel) === 'planting' && ' This removes the whole batch.'} This can't be undone.
          </p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </>
  )
}
