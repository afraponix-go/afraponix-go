import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { fetchGrowBeds } from '../growbeds/api'
import { fetchCropOptions } from './crops'
import { recordPlanting } from './plantGrowth'

const today = () => new Date().toISOString().slice(0, 10)

export function NewPlantingModal({ onClose }: { onClose: () => void }) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const { data: beds = [] } = useQuery({ queryKey: ['grow-beds', activeId], queryFn: () => fetchGrowBeds(activeId as string), enabled: !!activeId })
  const { data: crops = [] } = useQuery({ queryKey: ['crop-options', activeId], queryFn: () => fetchCropOptions(activeId as string), enabled: !!activeId })

  const [date, setDate] = useState(today())
  const [bed, setBed] = useState('')
  const [crop, setCrop] = useState('')
  const [count, setCount] = useState('')
  const [stage, setStage] = useState('seedling')
  const [variety, setVariety] = useState('')
  const [days, setDays] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cropDef = useMemo(() => crops.find((c) => c.value === crop), [crops, crop])

  function pickCrop(value: string) {
    setCrop(value)
    const def = crops.find((c) => c.value === value)
    // Prefill days-to-harvest from the crop reference when the field is empty.
    if (def?.days_to_harvest != null && !days) setDays(String(def.days_to_harvest))
  }

  const mutation = useMutation({
    mutationFn: () =>
      recordPlanting(activeId as string, {
        date,
        grow_bed_id: Number(bed),
        crop_type: crop,
        count: Number(count),
        growth_stage: stage,
        seed_variety: variety.trim() || undefined,
        days_to_harvest: days ? Number(days) : undefined,
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
    if (!bed) return setError('Choose a grow bed.')
    if (!crop) return setError('Choose a crop.')
    if (!(Number(count) > 0)) return setError('Enter how many were planted.')
    mutation.mutate()
  }

  return (
    <Modal title="New planting" onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field">
          <label htmlFor="np-crop">Crop</label>
          <select id="np-crop" value={crop} onChange={(e) => pickCrop(e.target.value)} autoFocus>
            <option value="">Select a crop…</option>
            {crops.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="np-bed">Grow bed</label>
          <select id="np-bed" value={bed} onChange={(e) => setBed(e.target.value)}>
            <option value="">Select a bed…</option>
            {beds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bed_name ?? `Bed ${b.id}`}
                {b.bed_type ? ` · ${b.bed_type}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="np-count">Number planted</label>
            <input id="np-count" type="number" min="1" step="1" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 24" />
          </div>
          <div className="field">
            <label htmlFor="np-stage">Stage</label>
            <select id="np-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="seedling">Seedling</option>
              <option value="transplant">Transplant</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="np-date">Date planted</label>
            <input id="np-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="np-days">Days to harvest <span className="unit-hint">· optional</span></label>
            <input id="np-days" type="number" min="1" step="1" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder={cropDef?.days_to_harvest ? String(cropDef.days_to_harvest) : 'e.g. 45'} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="np-variety">Seed variety <span className="unit-hint">· optional</span></label>
          <input id="np-variety" type="text" value={variety} onChange={(e) => setVariety(e.target.value)} placeholder="Optional" />
        </div>

        <div className="field">
          <label htmlFor="np-notes">Notes <span className="unit-hint">· optional</span></label>
          <input id="np-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Record planting'}</button>
        </div>
      </form>
    </Modal>
  )
}
