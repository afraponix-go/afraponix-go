import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { updatePlantEntry, isHarvestRow, type PlantRow } from './plantGrowth'

const QUALITIES = ['excellent', 'good', 'fair', 'poor']

export function EditEntryModal({ row, onClose }: { row: PlantRow; onClose: () => void }) {
  const qc = useQueryClient()
  const harvest = isHarvestRow(row)
  const [date, setDate] = useState((row.date ?? '').slice(0, 10))
  const [plants, setPlants] = useState(String((harvest ? row.plants_harvested : row.new_seedlings) ?? ''))
  const [weight, setWeight] = useState(row.harvest_weight != null ? String(row.harvest_weight / 1000) : '')
  const [quality, setQuality] = useState(row.health ?? 'good')
  const [notes, setNotes] = useState(row.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const n = Number(plants) || 0
      const w = Number(weight) || 0
      return updatePlantEntry(row.id, {
        date: date || row.date || null,
        grow_bed_id: row.grow_bed_id ?? null,
        crop_type: row.crop_type ?? null,
        count: row.count ?? null,
        harvest_weight: harvest ? (w > 0 ? Math.round(w * 1000) : null) : (row.harvest_weight ?? null),
        plants_harvested: harvest ? n : (row.plants_harvested ?? null),
        new_seedlings: harvest ? (row.new_seedlings ?? null) : n,
        pest_control: row.pest_control ?? null,
        health: harvest ? quality : (row.health ?? null),
        growth_stage: row.growth_stage ?? null,
        notes: notes.trim() || null,
      })
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
    mutation.mutate()
  }

  return (
    <Modal title={harvest ? 'Edit harvest' : 'Edit planting'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field-row">
          <div className="field">
            <label htmlFor="ee-date">Date</label>
            <input id="ee-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ee-plants">{harvest ? 'Plants harvested' : 'Plants'}</label>
            <input id="ee-plants" type="number" min="0" step="1" inputMode="numeric" value={plants} onChange={(e) => setPlants(e.target.value)} />
          </div>
        </div>

        {harvest && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="ee-weight">Weight <span className="unit-hint">(kg)</span></label>
              <input id="ee-weight" type="number" min="0" step="any" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ee-quality">Quality</label>
              <select id="ee-quality" value={quality} onChange={(e) => setQuality(e.target.value)}>
                {QUALITIES.map((q) => (
                  <option key={q} value={q}>{q.charAt(0).toUpperCase() + q.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="field">
          <label htmlFor="ee-notes">Notes <span className="unit-hint">· optional</span></label>
          <input id="ee-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  )
}
