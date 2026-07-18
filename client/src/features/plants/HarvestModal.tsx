import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { recordHarvest } from './plantGrowth'
import { prettyCrop } from './api'
import type { Batch } from './batches'

const today = () => new Date().toISOString().slice(0, 10)
const QUALITIES = ['excellent', 'good', 'fair', 'poor']

export function HarvestModal({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const [date, setDate] = useState(today())
  const [plants, setPlants] = useState('')
  const [weight, setWeight] = useState('')
  const [quality, setQuality] = useState('good')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      recordHarvest(activeId as string, {
        date,
        grow_bed_id: batch.grow_bed_id as number,
        crop_type: batch.crop_type,
        batch_id: batch.batch_id,
        plants_harvested: Number(plants) || 0,
        harvest_weight_kg: weight ? Number(weight) : undefined,
        quality,
        notes: notes.trim() || undefined,
      }),
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
    const p = Number(plants) || 0
    const w = Number(weight) || 0
    if (p <= 0 && w <= 0) return setError('Enter plants harvested and/or a weight.')
    if (p > batch.remaining) return setError(`Only ${batch.remaining} plants remaining in this batch.`)
    mutation.mutate()
  }

  return (
    <Modal title={`Harvest ${prettyCrop(batch.crop_type)}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p style={{ margin: '0 0 4px', color: 'var(--ink-faint)', fontSize: 13 }}>
          {batch.remaining} plants remaining · {batch.bed_name ?? `Bed ${batch.bed_number ?? '—'}`}
        </p>

        <div className="field-row">
          <div className="field">
            <label htmlFor="hv-plants">Plants harvested</label>
            <input id="hv-plants" type="number" min="0" step="1" inputMode="numeric" autoFocus value={plants} onChange={(e) => setPlants(e.target.value)} placeholder={`0–${batch.remaining}`} />
          </div>
          <div className="field">
            <label htmlFor="hv-weight">Weight <span className="unit-hint">(kg) · optional</span></label>
            <input id="hv-weight" type="number" min="0" step="any" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 1.5" />
          </div>
        </div>
        <div className="unit-hint" style={{ marginTop: -4 }}>Leave plants at 0 for a fruit-only harvest (plants stay in the bed).</div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="hv-date">Date</label>
            <input id="hv-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="hv-quality">Quality</label>
            <select id="hv-quality" value={quality} onChange={(e) => setQuality(e.target.value)}>
              {QUALITIES.map((q) => (
                <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="hv-notes">Notes <span className="unit-hint">· optional</span></label>
          <input id="hv-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Record harvest'}</button>
        </div>
      </form>
    </Modal>
  )
}
