import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { RateInput, type Rate } from '../../components/RateInput'
import { ApiError } from '../../lib/apiClient'
import { addFertiliser, updateFertiliser, NUTRIENT_OPTS, type Fertiliser, type NutrientKey, type PhDirection } from './api'
import '../spray/spray.css'
import './dosing.css'

const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))
const UNITS = ['ml', 'g', 'L', 'kg']

// Add or edit a catalogue product — a fertiliser (nutrient content + dose rate)
// or a pH buffer/acid (direction + strength + the nutrient it also adds).
export function AddFertiliserModal({ fertiliser, onClose, onAdded }: { fertiliser?: Fertiliser; onClose: () => void; onAdded?: (name: string) => void }) {
  const qc = useQueryClient()
  const editing = !!fertiliser
  const [kind, setKind] = useState<'fert' | 'buffer'>(fertiliser?.ph_direction ? 'buffer' : 'fert')
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
  const [direction, setDirection] = useState<PhDirection>(fertiliser?.ph_direction ?? 'down')
  const [strength, setStrength] = useState(fertiliser?.ph_strength != null ? String(fertiliser.ph_strength) : '')
  const [bufUnit, setBufUnit] = useState(fertiliser?.rate_unit ?? 'ml')
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => {
      const npkVals = { n: numOrNull(npk.n), p: numOrNull(npk.p), k: numOrNull(npk.k), ca: numOrNull(npk.ca), mg: numOrNull(npk.mg), fe: numOrNull(npk.fe) }
      const input = kind === 'buffer'
        ? { name: name.trim(), ...npkVals, ph_direction: direction, ph_strength: numOrNull(strength), rate_unit: bufUnit, rate_amount: null, rate_per_volume: null }
        : { name: name.trim(), ...npkVals, rate_amount: numOrNull(rate.amount), rate_unit: rate.unit, rate_per_volume: numOrNull(rate.per), ph_direction: null, ph_strength: null }
      return editing ? updateFertiliser(fertiliser!.id as number, input) : addFertiliser(input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dosing-fertilisers'] })
      qc.invalidateQueries({ queryKey: ['dosing-products'] })
      onAdded?.(name.trim())
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save the product.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter a name.')
    mut.mutate()
  }

  const isBuffer = kind === 'buffer'

  return (
    <Modal title={editing ? `Edit ${fertiliser?.name}` : isBuffer ? 'Add pH buffer' : 'Add fertiliser'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="seg cal-viewseg" role="tablist" aria-label="Type" style={{ marginBottom: 14 }}>
          <button type="button" role="tab" aria-selected={!isBuffer} className={`seg-btn${!isBuffer ? ' active' : ''}`} onClick={() => setKind('fert')}>Fertiliser</button>
          <button type="button" role="tab" aria-selected={isBuffer} className={`seg-btn${isBuffer ? ' active' : ''}`} onClick={() => setKind('buffer')}>pH buffer / acid</button>
        </div>

        <div className="field">
          <label htmlFor="fz-name">Name</label>
          <input id="fz-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={isBuffer ? 'e.g. Nitric Acid' : 'e.g. Calcium Nitrate'} autoFocus />
        </div>

        {isBuffer && (
          <div className="field-row">
            <div className="field">
              <label htmlFor="fz-dir">Direction</label>
              <select id="fz-dir" value={direction} onChange={(e) => setDirection(e.target.value as PhDirection)}>
                <option value="down">Lower pH (acid)</option>
                <option value="up">Raise pH (base)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="fz-str">Strength <span className="unit-hint">· {bufUnit} / 1000 L / pH</span></label>
              <div className="dr-qty">
                <input id="fz-str" type="number" min="0" step="any" inputMode="decimal" value={strength} onChange={(e) => setStrength(e.target.value)} placeholder="e.g. 2" />
                <select value={bufUnit} onChange={(e) => setBufUnit(e.target.value)} aria-label="Unit">
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="dz-label">Nutrient content <span className="unit-hint">{isBuffer ? '· what this buffer also adds (% w/w)' : '(% w/w)'}</span></div>
        <div className="fz-npk">
          {NUTRIENT_OPTS.map((o) => (
            <label className="fz-npk-cell" key={o.key}>
              <span>{o.short}</span>
              <input type="number" min="0" step="0.1" inputMode="decimal" value={npk[o.key]} onChange={(e) => setNpk((s) => ({ ...s, [o.key]: e.target.value }))} placeholder="0" />
            </label>
          ))}
        </div>

        {!isBuffer && (
          <div className="field">
            <label htmlFor="fz-rate">Dose rate</label>
            <RateInput id="fz-rate" value={rate} onChange={setRate} />
          </div>
        )}
        {isBuffer && <p className="dz-hint">Strength is a starting estimate — pH also depends on your water's alkalinity, so re-test after dosing.</p>}

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save' : isBuffer ? 'Add buffer' : 'Add fertiliser'}</button>
        </div>
      </form>
    </Modal>
  )
}
