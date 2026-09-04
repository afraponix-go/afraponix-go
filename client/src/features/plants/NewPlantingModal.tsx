import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { useSystems } from '../systems/SystemContext'
import { fetchGrowBeds } from '../growbeds/api'
import { fetchCropOptions, plantsPerM2FromSpacing, spacingFromPlantsPerM2, DEFAULT_PLANTS_PER_M2 } from './crops'
import { fetchSeedVarieties, addSeedVariety } from './cropsAdmin'
import { recordPlanting, batchLabel } from './plantGrowth'
import { fetchBatches } from './batches'

const today = () => new Date().toISOString().slice(0, 10)
const STAGES = [
  { value: 'seedling', label: 'Seedling' },
  { value: 'transplant', label: 'Transplant' },
  { value: 'vegetative', label: 'Vegetative growth' },
]
const ADD_NEW = '__add__'

export function NewPlantingModal({ initialBedId, onClose }: { initialBedId?: number; onClose: () => void }) {
  const { activeId } = useSystems()
  const qc = useQueryClient()
  const { data: beds = [] } = useQuery({ queryKey: ['grow-beds', activeId], queryFn: () => fetchGrowBeds(activeId as string), enabled: !!activeId })
  const { data: crops = [] } = useQuery({ queryKey: ['crop-options', activeId], queryFn: () => fetchCropOptions(activeId as string), enabled: !!activeId })
  const { data: allVarieties = [] } = useQuery({ queryKey: ['seed-varieties'], queryFn: fetchSeedVarieties })
  // Existing batch ids in this system — lets the new batch number disambiguate
  // (#2, #3) when the same crop/cultivar is sown twice in one week.
  const { data: batches = [] } = useQuery({ queryKey: ['plant-batches', activeId], queryFn: () => fetchBatches(activeId as string), enabled: !!activeId })

  const [date, setDate] = useState(today())
  const [bed, setBed] = useState(initialBedId != null ? String(initialBedId) : '')
  const [crop, setCrop] = useState('')
  const [count, setCount] = useState('')
  const [density, setDensity] = useState('')
  const [stage, setStage] = useState('seedling')
  const [variety, setVariety] = useState('')
  const [newVariety, setNewVariety] = useState('')
  const [days, setDays] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const cropDef = useMemo(() => crops.find((c) => c.value === crop), [crops, crop])
  const cropVarieties = useMemo(() => allVarieties.filter((v) => v.crop_type === crop), [allVarieties, crop])
  const selectedBed = useMemo(() => beds.find((b) => String(b.id) === bed), [beds, bed])
  const bedArea = selectedBed?.equivalent_m2 ?? null

  // Planting density: defaults from the crop's spacing, but editable per planting.
  const densityNum = Number(density) > 0 ? Number(density) : (plantsPerM2FromSpacing(cropDef?.plant_spacing_cm) ?? DEFAULT_PLANTS_PER_M2)
  const areaUsed = Number(count) > 0 ? Number(count) / densityNum : 0
  const spacingCm = spacingFromPlantsPerM2(densityNum)

  function pickCrop(value: string) {
    setCrop(value)
    setVariety('') // varieties are crop-specific
    setNewVariety('')
    const def = crops.find((c) => c.value === value)
    // Prefill days-to-harvest from the crop reference when the field is empty.
    if (def?.days_to_harvest != null && !days) setDays(String(def.days_to_harvest))
    // Default the planting density from the crop's spacing (user can override).
    setDensity(String(plantsPerM2FromSpacing(def?.plant_spacing_cm) ?? DEFAULT_PLANTS_PER_M2))
  }

  const mutation = useMutation({
    mutationFn: async () => {
      let sv = variety === ADD_NEW ? newVariety.trim() : variety
      // Persist a brand-new variety so it's available next time, then use it.
      if (variety === ADD_NEW && sv) {
        try {
          await addSeedVariety(crop, sv)
        } catch {
          /* ignore duplicates */
        }
      }
      return recordPlanting(activeId as string, {
        date,
        grow_bed_id: Number(bed),
        crop_type: crop,
        count: Number(count),
        plants_per_m2: densityNum,
        growth_stage: stage,
        seed_variety: sv || undefined,
        days_to_harvest: days ? Number(days) : undefined,
        notes: notes.trim() || undefined,
        batch_label: batchLabel(cropDef?.label ?? crop, sv),
        existing_batch_ids: batches.map((b) => b.batch_id),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      qc.invalidateQueries({ queryKey: ['plant-growth'] })
      qc.invalidateQueries({ queryKey: ['seed-varieties'] })
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
          <label htmlFor="np-variety">Seed variety <span className="unit-hint">· optional</span></label>
          <select id="np-variety" value={variety} onChange={(e) => setVariety(e.target.value)} disabled={!crop}>
            <option value="">{crop ? 'Select variety…' : 'Choose a crop first'}</option>
            {cropVarieties.map((v) => (
              <option key={v.id} value={v.variety_name}>{v.variety_name}</option>
            ))}
            {crop && <option value={ADD_NEW}>+ Add new variety…</option>}
          </select>
          {variety === ADD_NEW && (
            <input type="text" style={{ marginTop: 8 }} value={newVariety} onChange={(e) => setNewVariety(e.target.value)} placeholder="New variety name" autoFocus />
          )}
        </div>

        <div className="field">
          <label htmlFor="np-bed">Grow bed</label>
          <select id="np-bed" value={bed} onChange={(e) => setBed(e.target.value)} title={bedArea != null ? `${bedArea} m² growing area` : undefined}>
            <option value="">Select a bed…</option>
            {beds.map((b) => (
              <option key={b.id} value={b.id} title={b.equivalent_m2 != null ? `${b.equivalent_m2} m² growing area` : undefined}>
                {b.bed_name ?? `Bed ${b.id}`}
                {b.bed_type ? ` · ${b.bed_type}` : ''}
                {b.equivalent_m2 != null && b.equivalent_m2 > 0 ? ` · ${b.equivalent_m2} m²` : ''}
              </option>
            ))}
          </select>
          {selectedBed && bedArea != null && (
            <p className="field-hint">
              {selectedBed.bed_name ?? `Bed ${selectedBed.id}`} · {bedArea} m² growing area
              {areaUsed > 0 ? ` · this planting uses ~${areaUsed.toFixed(2)} m²` : ''}
            </p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="np-count">Number planted</label>
            <input id="np-count" type="number" min="1" step="1" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} placeholder="e.g. 24" />
          </div>
          <div className="field">
            <label htmlFor="np-density">Plants per m² <span className="unit-hint">· from crop, editable</span></label>
            <input id="np-density" type="number" min="1" step="0.5" inputMode="decimal" value={density} onChange={(e) => setDensity(e.target.value)} disabled={!crop} placeholder={String(plantsPerM2FromSpacing(cropDef?.plant_spacing_cm) ?? DEFAULT_PLANTS_PER_M2)} />
          </div>
        </div>
        {crop && (
          <p className="field-hint">
            ≈ {spacingCm} cm spacing{areaUsed > 0 ? ` · ${areaUsed.toFixed(2)} m² for ${count} plants` : ''}
          </p>
        )}

        <div className="field">
          <label htmlFor="np-stage">Growth stage</label>
          <select id="np-stage" value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
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
