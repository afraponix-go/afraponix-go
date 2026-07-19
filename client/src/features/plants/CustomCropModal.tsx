import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { saveCustomCrop, updateCustomCrop, type CustomCrop, type CustomCropInput } from './cropsAdmin'

const CATEGORIES = ['leafy_greens', 'fruiting_vegetables', 'herbs', 'root_vegetables', 'legumes', 'other']
const label = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const numOrU = (s: string): number | undefined => (s.trim() === '' || isNaN(Number(s)) ? undefined : Number(s))
const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

const NUTRIENTS = [
  { key: 'targetN', label: 'N' },
  { key: 'targetP', label: 'P' },
  { key: 'targetK', label: 'K' },
  { key: 'targetCa', label: 'Ca' },
  { key: 'targetMg', label: 'Mg' },
  { key: 'targetFe', label: 'Fe' },
] as const

export function CustomCropModal({ crop, onClose }: { crop?: CustomCrop; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!crop

  const [name, setName] = useState(crop?.crop_name ?? '')
  const [sciName, setSciName] = useState(crop?.scientific_name ?? '')
  const [category, setCategory] = useState(crop?.category ?? 'leafy_greens')
  const [spacing, setSpacing] = useState(crop?.plant_spacing != null ? String(crop.plant_spacing) : '')
  const [days, setDays] = useState(crop?.growth_days != null ? String(crop.growth_days) : '')
  const [ecMin, setEcMin] = useState(crop?.ec_min != null ? String(crop.ec_min) : '')
  const [ecMax, setEcMax] = useState(crop?.ec_max != null ? String(crop.ec_max) : '')
  const [nutrients, setNutrients] = useState<Record<string, string>>({
    targetN: crop?.target_n != null ? String(crop.target_n) : '',
    targetP: crop?.target_p != null ? String(crop.target_p) : '',
    targetK: crop?.target_k != null ? String(crop.target_k) : '',
    targetCa: crop?.target_ca != null ? String(crop.target_ca) : '',
    targetMg: crop?.target_mg != null ? String(crop.target_mg) : '',
    targetFe: crop?.target_fe != null ? String(crop.target_fe) : '',
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const min = numOrU(ecMin)
      const max = numOrU(ecMax)
      const input: CustomCropInput = {
        cropName: name.trim(),
        cropCode: crop?.crop_code || slug(name),
        scientificName: sciName.trim() || undefined,
        category,
        plantSpacing: numOrU(spacing),
        growthDays: numOrU(days),
        ecMin: min,
        ecMax: max,
        targetEc: min != null && max != null ? Math.round(((min + max) / 2) * 100) / 100 : min ?? max,
        targetN: numOrU(nutrients.targetN),
        targetP: numOrU(nutrients.targetP),
        targetK: numOrU(nutrients.targetK),
        targetCa: numOrU(nutrients.targetCa),
        targetMg: numOrU(nutrients.targetMg),
        targetFe: numOrU(nutrients.targetFe),
      }
      return editing ? updateCustomCrop(crop.id, input) : saveCustomCrop(input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-crops'] })
      qc.invalidateQueries({ queryKey: ['crop-options'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter a crop name.')
    mutation.mutate()
  }

  return (
    <Modal title={editing ? `Edit ${crop?.crop_name ?? 'crop'}` : 'Add crop'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field-row">
          <div className="field">
            <label htmlFor="cc-name">Crop name</label>
            <input id="cc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Purple Basil" autoFocus />
          </div>
          <div className="field">
            <label htmlFor="cc-cat">Category</label>
            <select id="cc-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="cc-sci">Scientific name <span className="unit-hint">· optional</span></label>
          <input id="cc-sci" type="text" value={sciName} onChange={(e) => setSciName(e.target.value)} placeholder="e.g. Ocimum basilicum" />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="cc-spacing">Spacing <span className="unit-hint">(cm)</span></label>
            <input id="cc-spacing" type="number" min="0" step="any" inputMode="decimal" value={spacing} onChange={(e) => setSpacing(e.target.value)} placeholder="15" />
          </div>
          <div className="field">
            <label htmlFor="cc-days">Days to harvest</label>
            <input id="cc-days" type="number" min="0" step="1" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="30" />
          </div>
          <div className="field">
            <label htmlFor="cc-ecmin">EC min</label>
            <input id="cc-ecmin" type="number" min="0" step="any" inputMode="decimal" value={ecMin} onChange={(e) => setEcMin(e.target.value)} placeholder="1.0" />
          </div>
          <div className="field">
            <label htmlFor="cc-ecmax">EC max</label>
            <input id="cc-ecmax" type="number" min="0" step="any" inputMode="decimal" value={ecMax} onChange={(e) => setEcMax(e.target.value)} placeholder="1.6" />
          </div>
        </div>

        <label className="field-label">Nutrient targets <span className="unit-hint">(ppm · optional)</span></label>
        <div className="nutrient-grid">
          {NUTRIENTS.map((nu) => (
            <div className="field" key={nu.key}>
              <label htmlFor={`cc-${nu.key}`}>{nu.label}</label>
              <input id={`cc-${nu.key}`} type="number" min="0" step="any" inputMode="decimal" value={nutrients[nu.key]} onChange={(e) => setNutrients((v) => ({ ...v, [nu.key]: e.target.value }))} />
            </div>
          ))}
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : editing ? 'Save crop' : 'Add crop'}</button>
        </div>
      </form>
    </Modal>
  )
}
