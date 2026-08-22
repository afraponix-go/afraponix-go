import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { recordApplication, type LogInput } from './api'
import { todayISO } from './shared'
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
  const [date, setDate] = useState(todayISO())
  const [productName, setProductName] = useState(prefill?.product_name ?? '')
  const [amount, setAmount] = useState('')
  const [area, setArea] = useState('')
  const [rate, setRate] = useState(prefill?.rate ?? '')
  const [dilution, setDilution] = useState('')
  const [weather, setWeather] = useState('')
  const [effectiveness, setEffectiveness] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => {
      const input: LogInput = {
        system_id: systemId,
        plan_id: prefill?.plan_id ?? null,
        product_id: prefill?.product_id ?? null,
        product_name: productName.trim() || prefill?.product_name || null,
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
    if (!productName.trim() && !prefill?.product_name) return setError('Enter the product used.')
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
            <label htmlFor="rec-product">Product</label>
            <input id="rec-product" type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Product used" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rec-amount">Amount used</label>
            <input id="rec-amount" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 200 ml" />
          </div>
          <div className="field">
            <label htmlFor="rec-rate">Rate</label>
            <input id="rec-rate" type="text" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 100 ml / 10L" />
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
