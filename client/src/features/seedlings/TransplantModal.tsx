import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchGrowBeds } from '../growbeds/api'
import { fetchCropOptions, plantsPerM2FromSpacing, spacingFromPlantsPerM2, DEFAULT_PLANTS_PER_M2 } from '../plants/crops'
import { transplantSeedling, type Seedling } from './api'
import './seedlings.css'

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const bedLabel = (b: { bed_name?: string | null; id: number }) => b.bed_name || `Bed ${b.id}`
const areaText = (m2?: number | null) => (m2 != null && m2 > 0 ? `${m2} m²` : null)

// A transplant creates a bed planting, so it captures the same key detail a
// planting does — the spacing (plants/m²). Crop + variety come from the sowing.
export function TransplantModal({ systemId, seedling, onClose }: { systemId: string; seedling: Seedling; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: beds = [] } = useQuery({ queryKey: ['grow-beds', systemId], queryFn: () => fetchGrowBeds(systemId) })
  const { data: crops = [] } = useQuery({ queryKey: ['crop-options', systemId], queryFn: () => fetchCropOptions(systemId) })

  const cropDef = useMemo(() => crops.find((c) => c.value === seedling.crop_code), [crops, seedling.crop_code])

  const [bedId, setBedId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [count, setCount] = useState(String(seedling.germinated_count ?? seedling.total_sown))
  const [density, setDensity] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Spacing defaults from the crop, editable — matches New Planting.
  const densityNum = Number(density) > 0 ? Number(density) : (plantsPerM2FromSpacing(cropDef?.plant_spacing_cm) ?? DEFAULT_PLANTS_PER_M2)
  const spacingCm = spacingFromPlantsPerM2(densityNum)
  const areaUsed = Number(count) > 0 ? Number(count) / densityNum : 0
  const selectedBed = useMemo(() => beds.find((b) => String(b.id) === bedId), [beds, bedId])
  const bedArea = selectedBed?.equivalent_m2 ?? null

  const mut = useMutation({
    mutationFn: () => transplantSeedling(seedling.id, {
      grow_bed_id: Number(bedId),
      transplant_date: date,
      transplanted_count: Number(count),
      plants_per_m2: densityNum,
      days_to_harvest: cropDef?.days_to_harvest ?? null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seedlings'] })
      qc.invalidateQueries({ queryKey: ['batches'] })
      qc.invalidateQueries({ queryKey: ['plant-batches'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!bedId) return setError('Choose a grow bed.')
    if (!date) return setError('Enter the transplant date.')
    if (!count || Number(count) <= 0) return setError('Enter how many were transplanted.')
    mut.mutate()
  }

  return (
    <Modal title={`Transplant · ${seedling.crop_name ?? 'seedlings'}${seedling.seed_variety ? ` (${seedling.seed_variety})` : ''}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p className="seedling-hint">Creates a planting batch in the chosen bed and marks this sowing transplanted.</p>

        <div className="field">
          <label htmlFor="t-bed">Grow bed</label>
          <select id="t-bed" value={bedId} onChange={(e) => setBedId(e.target.value)} title={bedArea != null ? `${bedArea} m² growing area` : undefined}>
            <option value="">Select a bed…</option>
            {beds.map((b) => (
              <option key={b.id} value={b.id} title={areaText(b.equivalent_m2) ? `${areaText(b.equivalent_m2)} growing area` : undefined}>
                {bedLabel(b)}{areaText(b.equivalent_m2) ? ` · ${areaText(b.equivalent_m2)}` : ''}
              </option>
            ))}
          </select>
          {selectedBed && (
            <p className="field-hint">
              {bedLabel(selectedBed)}{bedArea != null ? ` · ${bedArea} m² growing area` : ''}
              {areaUsed > 0 ? ` · this transplant uses ~${areaUsed.toFixed(2)} m²` : ''}
            </p>
          )}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="t-date">Transplant date</label>
            <input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="t-count">Plants transplanted</label>
            <input id="t-count" type="number" min="1" step="1" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="t-density">Plants per m² <span className="unit-hint">· spacing, from crop, editable</span></label>
          <input id="t-density" type="number" min="1" step="0.5" inputMode="decimal" value={density} onChange={(e) => setDensity(e.target.value)}
            placeholder={String(plantsPerM2FromSpacing(cropDef?.plant_spacing_cm) ?? DEFAULT_PLANTS_PER_M2)} />
          <p className="field-hint">≈ {spacingCm} cm spacing{areaUsed > 0 ? ` · ${areaUsed.toFixed(2)} m² for ${count} plants` : ''}</p>
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Transplant'}</button>
        </div>
      </form>
    </Modal>
  )
}
