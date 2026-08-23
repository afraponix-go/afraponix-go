import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchOperators } from '../spray/api'
import {
  recordDose,
  fetchLatestReadings,
  NUTRIENT_READKEY,
  NUTRIENT_OPTS,
  nutrientShort,
  type DosingProgramme,
} from './api'
import './dosing.css'

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s))
const QTY_UNITS = ['g', 'kg', 'ml', 'L']

// Record a dose against a dosing programme's target. The after-reading + recovery
// are filled later, on re-test (from the log).
export function DosingRecordModal({ systemId, programme, initialItemId, initialDate, onClose }: { systemId: string; programme: DosingProgramme; initialItemId?: number; initialDate?: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: latest } = useQuery({ queryKey: ['nutrients-latest', systemId], queryFn: () => fetchLatestReadings(systemId) })
  const { data: operators = [] } = useQuery({ queryKey: ['spray-operators'], queryFn: fetchOperators })

  const initialIdx = Math.max(0, programme.targets.findIndex((t) => t.id === initialItemId))
  const [idx, setIdx] = useState(initialIdx)
  const target = programme.targets[idx]
  const [date, setDate] = useState(initialDate ?? todayISO())
  const [before, setBefore] = useState('')
  const [product, setProduct] = useState(target?.product ?? '')
  const [qty, setQty] = useState('')
  const [qtyUnit, setQtyUnit] = useState('g')
  const [expected, setExpected] = useState('')
  const [ph, setPh] = useState('')
  const [operator, setOperator] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Prefill before-reading + product whenever the chosen target changes.
  useEffect(() => {
    const t = programme.targets[idx]
    if (!t) return
    setProduct(t.product ?? '')
    const rk = NUTRIENT_READKEY[t.nutrient]
    const v = latest?.[rk]
    setBefore(v != null ? String(v) : '')
  }, [idx, latest, programme.targets])

  const mut = useMutation({
    mutationFn: () => recordDose({
      system_id: systemId,
      programme_id: programme.id,
      item_id: target?.id ?? null,
      target_nutrient: target?.nutrient ?? 'n',
      event_date: date,
      product_name: product.trim() || null,
      quantity: numOrNull(qty),
      quantity_unit: qtyUnit,
      reading_before: numOrNull(before),
      expected_delta: numOrNull(expected),
      ph_at_dosing: numOrNull(ph),
      operator: operator.trim() || null,
      notes: notes.trim() || null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-log'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not record the dose.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) return setError('Enter the dose date.')
    if (!target) return setError('This programme has no targets.')
    mut.mutate()
  }

  const targetLabel = (t: DosingProgramme['targets'][number]) =>
    `${NUTRIENT_OPTS.find((o) => o.key === t.nutrient)?.label ?? t.nutrient} → ${t.target_value != null ? Number(t.target_value) : '—'} ppm${t.product ? ` · ${t.product}` : ''}`

  return (
    <Modal title={`Record dose · ${programme.name}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field">
          <label htmlFor="dr-target">Target</label>
          <select id="dr-target" value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
            {programme.targets.map((t, i) => <option key={t.id ?? i} value={i}>{targetLabel(t)}</option>)}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="dr-date">Dose date</label>
            <input id="dr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="dr-before">{target ? nutrientShort(target.nutrient) : 'N'} before <span className="unit-hint">(ppm)</span></label>
            <input id="dr-before" type="number" step="any" inputMode="decimal" value={before} onChange={(e) => setBefore(e.target.value)} placeholder="latest reading" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="dr-product">Fertiliser</label>
          <input id="dr-product" type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="product dosed" />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="dr-qty">Quantity applied</label>
            <div className="dr-qty">
              <input id="dr-qty" type="number" min="0" step="any" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
              <select value={qtyUnit} onChange={(e) => setQtyUnit(e.target.value)} aria-label="Unit">
                {QTY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="dr-exp">Expected Δ <span className="unit-hint">(ppm)</span></label>
            <input id="dr-exp" type="number" step="any" inputMode="decimal" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="optional" />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="dr-ph">pH at dosing</label>
            <input id="dr-ph" type="number" step="any" inputMode="decimal" value={ph} onChange={(e) => setPh(e.target.value)} placeholder="optional" />
          </div>
          <div className="field">
            <label htmlFor="dr-op">Operator</label>
            <select id="dr-op" value={operator} onChange={(e) => setOperator(e.target.value)}>
              <option value="">—</option>
              {operators.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="dr-notes">Notes</label>
          <input id="dr-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
        </div>

        <p className="dz-hint">Recovery is measured later — re-test the reading from the dosing log.</p>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Record dose'}</button>
        </div>
      </form>
    </Modal>
  )
}
