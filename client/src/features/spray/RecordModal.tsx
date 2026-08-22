import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchGrowBeds } from '../growbeds/api'
import { recordApplication, fetchProducts, fetchProgrammes, fetchOperators, addOperator, type LogInput } from './api'
import { CATEGORY_LABEL, todayISO } from './shared'
import './spray.css'

const WEATHER = ['', 'Sunny', 'Cloudy', 'Overcast', 'Windy', 'Calm', 'Morning', 'Evening']
const QTY_UNITS = ['L', 'ml', 'g', 'kg']
const DIL_UNITS = ['ml/10L', 'g/10L', 'ml/L', 'g/L', '%', 'ratio']

// Prefill for recording an application — from a due item, a calendar day, or blank.
export type RecordPrefill = {
  plan_id?: number | null
  product_id?: number | null
  product_name?: string | null
  rate?: string | null
  date?: string | null
}

// Parse a catalogue rate like "100 ml per 10L" into a numeric dilution.
function parseDilution(rate?: string | null): { value: number; unit: string } | null {
  if (!rate) return null
  let m = rate.match(/([\d.]+)\s*(ml|g|kg)\s*(?:per|\/)\s*([\d.]+)\s*l/i)
  if (m) return { value: Number(m[1]), unit: `${m[2].toLowerCase()}/${Number(m[3])}L` }
  m = rate.match(/([\d.]+)\s*(ml|g|kg)\s*\/\s*l/i)
  if (m) return { value: Number(m[1]), unit: `${m[2].toLowerCase()}/L` }
  return null
}

export function RecordModal({ systemId, prefill, onClose }: { systemId: string; prefill?: RecordPrefill; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: products = [] } = useQuery({ queryKey: ['spray-products'], queryFn: fetchProducts })
  const { data: programmes = [] } = useQuery({ queryKey: ['spray-programmes', systemId], queryFn: () => fetchProgrammes(systemId) })
  const { data: beds = [] } = useQuery({ queryKey: ['grow-beds', systemId], queryFn: () => fetchGrowBeds(systemId) })
  const { data: operators = [] } = useQuery({ queryKey: ['spray-operators'], queryFn: fetchOperators })

  const initDil = parseDilution(prefill?.rate)
  const [date, setDate] = useState(prefill?.date ?? todayISO())
  const [productId, setProductId] = useState<number | null>(prefill?.product_id ?? null)
  const [productName, setProductName] = useState(prefill?.product_name ?? '')
  const [wholeSystem, setWholeSystem] = useState(true)
  const [bedIds, setBedIds] = useState<number[]>([])
  const toggleBed = (id: number) => setBedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const [rate, setRate] = useState(prefill?.rate ?? '')
  const [quantity, setQuantity] = useState('')
  const [quantityUnit, setQuantityUnit] = useState('L')
  const [dilValue, setDilValue] = useState(initDil ? String(initDil.value) : '')
  const [dilUnit, setDilUnit] = useState(initDil?.unit && DIL_UNITS.includes(initDil.unit) ? initDil.unit : 'ml/10L')
  const [weather, setWeather] = useState('')
  const [operator, setOperator] = useState('')
  const [addingOp, setAddingOp] = useState(false)
  const [newOp, setNewOp] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const addOpMut = useMutation({
    mutationFn: (name: string) => addOperator(name),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['spray-operators'] }); if (d.operator) setOperator(d.operator.name); setAddingOp(false); setNewOp('') },
  })

  // Products in the programme being recorded against come first, then the rest.
  const planProductIds = useMemo(() => {
    const plan = programmes.find((p) => p.id === prefill?.plan_id)
    return new Set((plan?.products ?? []).map((pp) => pp.product_id))
  }, [programmes, prefill?.plan_id])
  const inProgramme = products.filter((p) => planProductIds.has(p.id))
  const others = products.filter((p) => !planProductIds.has(p.id))
  const grouped = useMemo(() => {
    const byCat: Record<string, typeof products> = {}
    for (const p of others) (byCat[p.category] ??= []).push(p)
    return byCat
  }, [others])

  const onSelectProduct = (val: string) => {
    if (val === 'other' || val === '') { setProductId(null); return }
    const p = products.find((x) => x.id === Number(val))
    if (!p) return
    setProductId(p.id)
    setProductName(p.product_name)
    if (p.default_rate) {
      setRate(p.default_rate)
      const d = parseDilution(p.default_rate)
      if (d) { setDilValue(String(d.value)); if (DIL_UNITS.includes(d.unit)) setDilUnit(d.unit) }
    }
  }
  const selValue = productId != null ? String(productId) : (productName ? 'other' : '')
  const selectedProduct = products.find((p) => p.id === productId)

  const mut = useMutation({
    mutationFn: () => {
      const input: LogInput = {
        system_id: systemId,
        plan_id: prefill?.plan_id ?? null,
        product_id: productId,
        product_name: productName.trim() || null,
        bed_ids: wholeSystem ? [] : bedIds,
        application_date: date,
        rate: rate.trim() || null,
        quantity: quantity ? Number(quantity) : null,
        quantity_unit: quantity ? quantityUnit : null,
        dilution_value: dilValue ? Number(dilValue) : null,
        dilution_unit: dilValue ? dilUnit : null,
        weather: weather || null,
        operator: operator.trim() || null,
        notes: notes.trim() || null,
      }
      return recordApplication(input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['spray-log'] })
      qc.invalidateQueries({ queryKey: ['spray-due'] })
      qc.invalidateQueries({ queryKey: ['spray-calendar'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) return setError('Enter the application date.')
    if (!productName.trim()) return setError('Choose or name the product used.')
    mut.mutate()
  }

  return (
    <Modal title="Record spray application" onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-date">Date</label>
            <input id="rec-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="rec-prodsel">Product</label>
            <select id="rec-prodsel" value={selValue} onChange={(e) => onSelectProduct(e.target.value)}>
              <option value="">Select a product…</option>
              {inProgramme.length > 0 && (
                <optgroup label="In this programme">
                  {inProgramme.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                </optgroup>
              )}
              {Object.keys(grouped).sort().map((cat) => (
                <optgroup key={cat} label={CATEGORY_LABEL[cat] ?? cat}>
                  {grouped[cat].map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                </optgroup>
              ))}
              <option value="other">Other (type below)</option>
            </select>
          </div>
        </div>
        {selValue === 'other' && (
          <div className="field">
            <label htmlFor="rec-product">Product name</label>
            <input id="rec-product" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product used" />
          </div>
        )}

        <div className="field">
          <label>Apply to</label>
          <div className="spray-scope">
            <label className="spray-scope-all">
              <input type="checkbox" checked={wholeSystem} onChange={(e) => setWholeSystem(e.target.checked)} />
              <span>Entire system</span>
            </label>
            {!wholeSystem && (
              beds.length === 0 ? <span className="spray-scope-empty">No grow beds configured.</span> : (
                <div className="spray-beds">
                  {beds.map((b) => (
                    <label key={b.id} className="spray-bed">
                      <input type="checkbox" checked={bedIds.includes(b.id)} onChange={() => toggleBed(b.id)} />
                      <span>{b.bed_name || `Bed ${b.id}`}</span>
                    </label>
                  ))}
                </div>
              )
            )}
          </div>
          <span className="hint spray-scope-hint">The plant batches in the selected beds are logged as sprayed.</span>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-qty">Quantity applied</label>
            <div className="spray-numunit">
              <input id="rec-qty" type="number" min="0" step="any" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 15" />
              <select value={quantityUnit} onChange={(e) => setQuantityUnit(e.target.value)}>
                {QTY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="rec-dil">Dilution</label>
            <div className="spray-numunit">
              <input id="rec-dil" type="number" min="0" step="any" inputMode="decimal" value={dilValue} onChange={(e) => setDilValue(e.target.value)} placeholder="e.g. 100" />
              <select value={dilUnit} onChange={(e) => setDilUnit(e.target.value)}>
                {DIL_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>
        {rate && <p className="hint spray-rec-hint">Recommended dose: {rate}</p>}
        {selectedProduct && (selectedProduct.phi_days != null || selectedProduct.resistance_group) && (
          <p className="hint spray-rec-hint">
            {selectedProduct.phi_days != null && <>PHI {selectedProduct.phi_days} day{selectedProduct.phi_days === 1 ? '' : 's'}{selectedProduct.resistance_group ? ' · ' : ''}</>}
            {selectedProduct.resistance_group && <>Group {selectedProduct.resistance_group}</>}
          </p>
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-weather">Conditions</label>
            <select id="rec-weather" value={weather} onChange={(e) => setWeather(e.target.value)}>
              {WEATHER.map((w) => <option key={w} value={w}>{w || '—'}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rec-operator">Operator</label>
            {addingOp ? (
              <div className="spray-numunit">
                <input type="text" value={newOp} onChange={(e) => setNewOp(e.target.value)} placeholder="New operator name" autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newOp.trim()) addOpMut.mutate(newOp.trim()) } }} />
                <button type="button" className="row-btn" disabled={addOpMut.isPending || !newOp.trim()} onClick={() => addOpMut.mutate(newOp.trim())}>Add</button>
                <button type="button" className="link-btn" onClick={() => { setAddingOp(false); setNewOp('') }}>Cancel</button>
              </div>
            ) : (
              <select id="rec-operator" value={operator} onChange={(e) => { if (e.target.value === '__add__') setAddingOp(true); else setOperator(e.target.value) }}>
                <option value="">—</option>
                {operators.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                <option value="__add__">＋ Add new operator…</option>
              </select>
            )}
          </div>
        </div>
        <div className="field">
          <label htmlFor="rec-notes">Notes</label>
          <input id="rec-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" />
        </div>
        <p className="hint spray-rec-hint">Effectiveness is rated later, from the log.</p>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Record'}</button>
        </div>
      </form>
    </Modal>
  )
}
