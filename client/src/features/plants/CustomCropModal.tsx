import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { saveCustomCrop, updateCustomCrop, type CustomCrop, type CustomCropInput } from './cropsAdmin'

const CATEGORIES = ['leafy_greens', 'fruiting_vegetables', 'herbs', 'root_vegetables', 'legumes', 'other']
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced']
const label = (s: string) => s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const numOrU = (s: string): number | undefined => (s.trim() === '' || isNaN(Number(s)) ? undefined : Number(s))

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
  const [category, setCategory] = useState(crop?.category ?? 'leafy_greens')
  const [spacing, setSpacing] = useState(crop?.plant_spacing != null ? String(crop.plant_spacing) : '')
  const [days, setDays] = useState(crop?.growth_days != null ? String(crop.growth_days) : '')
  const [difficulty, setDifficulty] = useState(crop?.difficulty ?? 'beginner')
  const [ec, setEc] = useState(crop?.target_ec != null ? String(crop.target_ec) : '')
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
      const input: CustomCropInput = {
        cropName: name.trim(),
        category,
        plantSpacing: numOrU(spacing),
        growthDays: numOrU(days),
        difficulty,
        targetEc: numOrU(ec),
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
    <Modal title={editing ? 'Edit custom crop' : 'Add custom crop'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field">
          <label htmlFor="cc-name">Crop name</label>
          <input id="cc-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Purple Basil" autoFocus />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="cc-cat">Category</label>
            <select id="cc-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cc-diff">Difficulty</label>
            <select id="cc-diff" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{label(d)}</option>)}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="cc-spacing">Plant spacing <span className="unit-hint">(cm)</span></label>
            <input id="cc-spacing" type="number" min="0" step="any" inputMode="decimal" value={spacing} onChange={(e) => setSpacing(e.target.value)} placeholder="15" />
          </div>
          <div className="field">
            <label htmlFor="cc-days">Days to harvest</label>
            <input id="cc-days" type="number" min="0" step="1" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} placeholder="30" />
          </div>
          <div className="field">
            <label htmlFor="cc-ec">Target EC</label>
            <input id="cc-ec" type="number" min="0" step="any" inputMode="decimal" value={ec} onChange={(e) => setEc(e.target.value)} placeholder="1.6" />
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
