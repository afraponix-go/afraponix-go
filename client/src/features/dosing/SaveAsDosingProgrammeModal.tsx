import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { KEYS, type Levels, type Product } from '../calculator/nutrientDosing'
import { createDosingProgramme, nutrientShort, WEEKDAYS, WEEKDAY_LABEL } from './api'
import '../spray/spray.css'
import './dosing.css'

// Turn the calculator's crop targets + fertilisers into a dosing programme: one
// target row per nutrient with a positive target, each auto-assigned the fertiliser
// richest in that nutrient. Editable afterwards from Operations.
export function SaveAsDosingProgrammeModal({ systemId, cropName, target, products, onClose }: {
  systemId: string
  cropName: string
  target: Levels
  products: Product[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(`${cropName} maintenance`)
  const [days, setDays] = useState<string[]>(['mon'])
  const [error, setError] = useState<string | null>(null)

  const rows = useMemo(() =>
    KEYS.filter((k) => target[k] > 0).map((k) => {
      const best = products.reduce<Product | null>((b, p) => (p[k] > (b?.[k] ?? 0) ? p : b), null)
      return { nutrient: k, target_value: Math.round(target[k] * 10) / 10, product: best && best[k] > 0 ? best.name : null }
    }), [target, products])

  const toggleDay = (d: string) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))

  const mut = useMutation({
    mutationFn: () => createDosingProgramme(systemId, { name: name.trim(), targets: rows.map((r) => ({ ...r, days })) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-programmes'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not create the programme.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the programme a name.')
    if (rows.length === 0) return setError('No positive targets to save.')
    if (days.length === 0) return setError('Pick at least one test day.')
    mut.mutate()
  }

  return (
    <Modal title="Save as dosing programme" onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="sdp-name">Programme name</label>
          <input id="sdp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        <div className="dz-label">Targets <span className="unit-hint">(from the calculator)</span></div>
        <div className="dp-targets" style={{ gap: 6 }}>
          {rows.map((r) => (
            <div key={r.nutrient} className="dp-cp">
              <span className="dp-cp-target">{nutrientShort(r.nutrient)} → {r.target_value} ppm</span>
              <span className="dp-cp-fert">{r.product ?? 'no fertiliser'}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="dz-hint">No positive targets — pick a crop with targets first.</div>}
        </div>

        <div className="dz-label">Test / dose days</div>
        <div className="pm-days">
          {WEEKDAYS.map((d) => (
            <button key={d} type="button" className={days.includes(d) ? 'on' : ''} onClick={() => toggleDay(d)}>{WEEKDAY_LABEL[d]}</button>
          ))}
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending || rows.length === 0}>{mut.isPending ? 'Saving…' : 'Create programme'}</button>
        </div>
      </form>
    </Modal>
  )
}
