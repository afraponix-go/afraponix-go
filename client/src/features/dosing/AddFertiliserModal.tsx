import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { RateInput, type Rate } from '../../components/RateInput'
import { ApiError } from '../../lib/apiClient'
import { addFertiliser, updateFertiliser, NUTRIENT_OPTS, type Fertiliser, type NutrientKey } from './api'
import './dosing.css'

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))

// Add or edit a single fertiliser (nutrient content + structured dose). Used
// inline from the dosing programme builder and from the fertiliser catalogue.
export function AddFertiliserModal({ fertiliser, onClose, onAdded }: { fertiliser?: Fertiliser; onClose: () => void; onAdded?: (name: string) => void }) {
  const qc = useQueryClient()
  const editing = !!fertiliser
  const [name, setName] = useState(fertiliser?.name ?? '')
  const [npk, setNpk] = useState<Record<NutrientKey, string>>({
    n: fertiliser?.n ? String(fertiliser.n) : '', p: fertiliser?.p ? String(fertiliser.p) : '', k: fertiliser?.k ? String(fertiliser.k) : '',
    ca: fertiliser?.ca ? String(fertiliser.ca) : '', mg: fertiliser?.mg ? String(fertiliser.mg) : '', fe: fertiliser?.fe ? String(fertiliser.fe) : '',
  })
  const [rate, setRate] = useState<Rate>({
    amount: fertiliser?.rate_amount != null ? String(fertiliser.rate_amount) : '',
    unit: fertiliser?.rate_unit ?? 'g',
    per: fertiliser?.rate_per_volume != null ? String(fertiliser.rate_per_volume) : '100',
  })
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => {
      const input = {
        name: name.trim(),
        n: numOrNull(npk.n), p: numOrNull(npk.p), k: numOrNull(npk.k), ca: numOrNull(npk.ca), mg: numOrNull(npk.mg), fe: numOrNull(npk.fe),
        rate_amount: numOrNull(rate.amount), rate_unit: rate.unit, rate_per_volume: numOrNull(rate.per),
      }
      return editing ? updateFertiliser(fertiliser!.id as number, input) : addFertiliser(input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dosing-fertilisers'] })
      qc.invalidateQueries({ queryKey: ['dosing-products'] })
      onAdded?.(name.trim())
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save the fertiliser.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter a fertiliser name.')
    mut.mutate()
  }

  return (
    <Modal title={editing ? `Edit ${fertiliser?.name}` : 'Add fertiliser'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="fz-name">Fertiliser name</label>
          <input id="fz-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Calcium Nitrate" autoFocus />
        </div>
        <div className="dz-label">Nutrient content <span className="unit-hint">(% w/w)</span></div>
        <div className="fz-npk">
          {NUTRIENT_OPTS.map((o) => (
            <label className="fz-npk-cell" key={o.key}>
              <span>{o.short}</span>
              <input type="number" min="0" step="0.1" inputMode="decimal" value={npk[o.key]} onChange={(e) => setNpk((s) => ({ ...s, [o.key]: e.target.value }))} placeholder="0" />
            </label>
          ))}
        </div>
        <div className="field">
          <label htmlFor="fz-rate">Dose rate</label>
          <RateInput id="fz-rate" value={rate} onChange={setRate} />
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save' : 'Add fertiliser'}</button>
        </div>
      </form>
    </Modal>
  )
}
