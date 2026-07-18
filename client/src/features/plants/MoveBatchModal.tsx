import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { fetchGrowBeds } from '../growbeds/api'
import { moveBatch } from './plantGrowth'
import { prettyCrop } from './api'
import type { Batch } from './batches'

export function MoveBatchModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const { data: beds = [] } = useQuery({ queryKey: ['grow-beds', activeId], queryFn: () => fetchGrowBeds(activeId as string), enabled: !!activeId })
  const [dest, setDest] = useState('')
  const [error, setError] = useState<string | null>(null)

  const others = beds.filter((b) => b.id !== batch.grow_bed_id)

  const mutation = useMutation({
    mutationFn: () => moveBatch(activeId as string, batch.batch_id, Number(dest)),
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
    if (!dest) return setError('Choose a destination bed.')
    mutation.mutate()
  }

  return (
    <Modal title={`Move ${prettyCrop(batch.crop_type)} batch`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p style={{ margin: '0 0 4px', color: 'var(--ink-faint)', fontSize: 13 }}>
          {batch.remaining} plants · currently in {batch.bed_name ?? `Bed ${batch.bed_number ?? '—'}`}
        </p>
        <div className="field">
          <label htmlFor="mb-dest">Move to bed</label>
          <select id="mb-dest" value={dest} onChange={(e) => setDest(e.target.value)} autoFocus>
            <option value="">Select a bed…</option>
            {others.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bed_name ?? `Bed ${b.id}`}
                {b.bed_type ? ` · ${b.bed_type}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Moving…' : 'Move batch'}</button>
        </div>
      </form>
    </Modal>
  )
}
