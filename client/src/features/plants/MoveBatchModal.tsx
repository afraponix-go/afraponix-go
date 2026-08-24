import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { canWriteSystem, isOwnedSystem } from '../systems/api'
import { fetchGrowBeds } from '../growbeds/api'
import { moveBatch, transferBatch } from './plantGrowth'
import { prettyCrop } from './api'
import type { Batch } from './batches'

export function MoveBatchModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const { activeId, allSystems } = useSystems()
  const qc = useQueryClient()

  // Destination system: default the current one (a plain bed move). Only systems
  // the user can write to are valid destinations.
  const [destSys, setDestSys] = useState(activeId ?? '')
  const [dest, setDest] = useState('')
  const [count, setCount] = useState(String(batch.remaining))
  const [error, setError] = useState<string | null>(null)

  const writable = allSystems.filter((s) => canWriteSystem(s))
  const crossSystem = destSys !== activeId

  const { data: beds = [] } = useQuery({
    queryKey: ['grow-beds', destSys],
    queryFn: () => fetchGrowBeds(destSys),
    enabled: !!destSys,
  })
  // Same system: can't move to the bed it's already in. Cross-system: any bed.
  const bedOptions = crossSystem ? beds : beds.filter((b) => b.id !== batch.grow_bed_id)

  const mutation = useMutation({
    mutationFn: () => {
      if (crossSystem) {
        const n = Math.round(Number(count))
        return transferBatch({ from_system_id: activeId as string, batch_id: batch.batch_id, to_system_id: destSys, to_bed_id: Number(dest), count: n > 0 ? n : undefined })
      }
      return moveBatch(activeId as string, batch.batch_id, Number(dest))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      qc.invalidateQueries({ queryKey: ['plant-growth'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!destSys) return setError('Choose a destination system.')
    if (!dest) return setError('Choose a destination bed.')
    if (crossSystem && !(Number(count) > 0)) return setError('Enter how many plants to move.')
    mutation.mutate()
  }

  return (
    <Modal title={`Move ${prettyCrop(batch.crop_type)} batch`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p style={{ margin: '0 0 4px', color: 'var(--ink-faint)', fontSize: 13 }}>
          {batch.remaining} plants · currently in {batch.bed_name ?? `Bed ${batch.bed_number ?? '—'}`}
        </p>

        {writable.length > 1 && (
          <div className="field">
            <label htmlFor="mb-sys">System</label>
            <select id="mb-sys" value={destSys} onChange={(e) => { setDestSys(e.target.value); setDest('') }}>
              {writable.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.system_name}{s.id === activeId ? ' (this system)' : isOwnedSystem(s) ? '' : ' (shared)'}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="mb-dest">Move to bed</label>
          <select id="mb-dest" value={dest} onChange={(e) => setDest(e.target.value)} autoFocus>
            <option value="">Select a bed…</option>
            {bedOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bed_name ?? `Bed ${b.id}`}{b.bed_type ? ` · ${b.bed_type}` : ''}
              </option>
            ))}
          </select>
        </div>

        {crossSystem && (
          <div className="field">
            <label htmlFor="mb-count">How many plants <span className="unit-hint">(up to {batch.remaining})</span></label>
            <input id="mb-count" type="number" min="1" max={batch.remaining} step="1" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
        )}

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? (crossSystem ? 'Transferring…' : 'Moving…') : crossSystem ? 'Transfer batch' : 'Move batch'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
