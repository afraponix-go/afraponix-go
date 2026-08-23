import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { DEFAULT_PRODUCTS } from '../calculator/nutrientDosing'
import {
  fetchFertilisers,
  createDosingProgramme,
  updateDosingProgramme,
  NUTRIENT_OPTS,
  WEEKDAYS,
  WEEKDAY_LABEL,
  type DosingProgramme,
  type NutrientKey,
} from './api'
import { AddFertiliserModal } from './AddFertiliserModal'
import '../spray/spray.css'
import './dosing.css'

type Row = { nutrient: NutrientKey; target_value: string; product: string }

// Target-band maintenance: hold one or more nutrients at a target, on a weekly
// test/dose cadence. The dose amount itself is decided at record time from the
// calculator — this just captures the targets, the preferred fertiliser, and the
// cadence.
export function DosingProgrammeModal({ systemId, programme, onClose }: { systemId: string; programme?: DosingProgramme; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!programme
  const { data: ferts = [] } = useQuery({ queryKey: ['dosing-fertilisers'], queryFn: fetchFertilisers })
  const fertNames = useMemo(() => {
    const names = ferts.map((f) => f.name)
    return names.length ? names : DEFAULT_PRODUCTS.map((p) => p.name)
  }, [ferts])

  const [name, setName] = useState(programme?.name ?? '')
  const [notes, setNotes] = useState(programme?.notes ?? '')
  const [days, setDays] = useState<string[]>(programme?.targets?.[0]?.days?.length ? programme.targets[0].days : ['mon'])
  const [rows, setRows] = useState<Row[]>(
    programme?.targets?.length
      ? programme.targets.map((t) => ({ nutrient: t.nutrient, target_value: t.target_value != null ? String(t.target_value) : '', product: t.product ?? '' }))
      : [{ nutrient: 'n', target_value: '', product: '' }],
  )
  const [addingFert, setAddingFert] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const addRow = () => setRows((rs) => [...rs, { nutrient: 'n', target_value: '', product: '' }])
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))
  const toggleDay = (d: string) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d]))

  const mut = useMutation({
    mutationFn: () => {
      const targets = rows
        .filter((r) => r.target_value.trim() !== '')
        .map((r) => ({ nutrient: r.nutrient, target_value: Number(r.target_value), product: r.product.trim() || null, days }))
      const input = { name: name.trim(), notes: notes.trim() || null, targets }
      return editing ? updateDosingProgramme(programme!.id, input) : createDosingProgramme(systemId, input)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-programmes'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the programme a name.')
    if (rows.every((r) => r.target_value.trim() === '')) return setError('Set at least one target value.')
    if (days.length === 0) return setError('Pick at least one test day.')
    mut.mutate()
  }

  return (
    <Modal title={editing ? `Edit ${programme?.name}` : 'New dosing programme'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="dp-name">Programme name</label>
          <input id="dp-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nitrogen maintenance" autoFocus />
        </div>

        <div className="dz-label">Targets to hold <span className="unit-hint">(ppm)</span></div>
        <div className="dp-targets">
          {rows.map((r, i) => (
            <div className="dp-target" key={i}>
              <select value={r.nutrient} onChange={(e) => setRow(i, { nutrient: e.target.value as NutrientKey })} aria-label="Nutrient">
                {NUTRIENT_OPTS.map((o) => <option key={o.key} value={o.key}>{o.short}</option>)}
              </select>
              <input type="number" min="0" step="any" inputMode="decimal" placeholder="target" value={r.target_value} onChange={(e) => setRow(i, { target_value: e.target.value })} />
              <select value={r.product} onChange={(e) => { if (e.target.value === '__add__') setAddingFert(i); else setRow(i, { product: e.target.value }) }} aria-label="Fertiliser">
                <option value="">Fertiliser…</option>
                {fertNames.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value="__add__">＋ Add new fertiliser…</option>
              </select>
              <button type="button" className="dz-x" onClick={() => removeRow(i)} disabled={rows.length === 1} aria-label="Remove">×</button>
            </div>
          ))}
          <button type="button" className="link-btn" onClick={addRow}>+ Add target</button>
        </div>

        <div className="dz-label">Test / dose days</div>
        <div className="pm-days">
          {WEEKDAYS.map((d) => (
            <button key={d} type="button" className={days.includes(d) ? 'on' : ''} onClick={() => toggleDay(d)}>{WEEKDAY_LABEL[d]}</button>
          ))}
        </div>

        <div className="field">
          <label htmlFor="dp-notes">Notes</label>
          <textarea id="dp-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save programme' : 'Create programme'}</button>
        </div>
      </form>

      {addingFert != null && (
        <AddFertiliserModal
          onClose={() => setAddingFert(null)}
          onAdded={(nm) => { setRow(addingFert, { product: nm }); }}
        />
      )}
    </Modal>
  )
}
