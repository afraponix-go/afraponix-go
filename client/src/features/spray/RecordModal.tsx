import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { recordApplication, fetchProducts, type LogInput } from './api'
import { CATEGORY_LABEL, todayISO } from './shared'
import './spray.css'

const WEATHER = ['', 'Sunny', 'Cloudy', 'Overcast', 'Windy', 'Calm', 'Morning', 'Evening']

// Prefill for recording an application — from a due item, a plan product, or blank.
export type RecordPrefill = {
  plan_id?: number | null
  product_id?: number | null
  product_name?: string | null
  rate?: string | null
}

export function RecordModal({ systemId, prefill, onClose }: { systemId: string; prefill?: RecordPrefill; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: products = [] } = useQuery({ queryKey: ['spray-products'], queryFn: fetchProducts })

  const [date, setDate] = useState(todayISO())
  const [productId, setProductId] = useState<number | null>(prefill?.product_id ?? null)
  const [productName, setProductName] = useState(prefill?.product_name ?? '')
  const [amount, setAmount] = useState('')
  const [area, setArea] = useState('')
  const [rate, setRate] = useState(prefill?.rate ?? '')
  const [dilution, setDilution] = useState('')
  const [weather, setWeather] = useState('')
  const [effectiveness, setEffectiveness] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const byCat: Record<string, typeof products> = {}
    for (const p of products) (byCat[p.category] ??= []).push(p)
    return byCat
  }, [products])

  // Pick a catalogue product → fill the name and auto-populate its recommended dose.
  const onSelectProduct = (val: string) => {
    if (val === 'other' || val === '') {
      setProductId(null)
      return
    }
    const p = products.find((x) => x.id === Number(val))
    if (!p) return
    setProductId(p.id)
    setProductName(p.product_name)
    if (p.default_rate) setRate(p.default_rate)
  }
  const selValue = productId != null ? String(productId) : (productName ? 'other' : '')

  const mut = useMutation({
    mutationFn: () => {
      const input: LogInput = {
        system_id: systemId,
        plan_id: prefill?.plan_id ?? null,
        product_id: productId,
        product_name: productName.trim() || null,
        application_date: date,
        rate: rate.trim() || null,
        amount: amount.trim() || null,
        area: area.trim() || null,
        dilution: dilution.trim() || null,
        weather: weather || null,
        effectiveness: effectiveness ? Number(effectiveness) : null,
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
        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-rate">Rate <span className="unit-hint">· recommended dose</span></label>
            <input id="rec-rate" type="text" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 100 ml / 10L" />
          </div>
          <div className="field">
            <label htmlFor="rec-amount">Amount used</label>
            <input id="rec-amount" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 200 ml" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-area">Area treated</label>
            <input id="rec-area" type="text" value={area} onChange={(e) => setArea(e.target.value)} placeholder="e.g. 12 m² / 3 beds" />
          </div>
          <div className="field">
            <label htmlFor="rec-dilution">Dilution / mixing</label>
            <input id="rec-dilution" type="text" value={dilution} onChange={(e) => setDilution(e.target.value)} placeholder="e.g. 1:100" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-weather">Conditions</label>
            <select id="rec-weather" value={weather} onChange={(e) => setWeather(e.target.value)}>
              {WEATHER.map((w) => <option key={w} value={w}>{w || '—'}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rec-eff">Effectiveness (1–5)</label>
            <input id="rec-eff" type="number" min="1" max="5" step="1" value={effectiveness} onChange={(e) => setEffectiveness(e.target.value)} placeholder="—" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="rec-notes">Notes</label>
          <textarea id="rec-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Record'}</button>
        </div>
      </form>
    </Modal>
  )
}
