import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { ApiError } from '../../lib/apiClient'
import { createWaterQualityReading, fetchWaterQualityHistory, type WaterQualityInput } from './api'
import '../dashboard/dashboard.css'
import './water.css'

type FieldDef = { key: keyof WaterQualityInput; label: string; unit?: string; step?: string }
const FIELDS: FieldDef[] = [
  { key: 'temperature', label: 'Water Temp', unit: '°C', step: '0.1' },
  { key: 'ph', label: 'pH', step: '0.01' },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', unit: 'mg/L', step: '0.1' },
  { key: 'ammonia', label: 'Ammonia', unit: 'ppm', step: '0.01' },
  { key: 'nitrite', label: 'Nitrite', unit: 'ppm', step: '0.01' },
  { key: 'nitrate', label: 'Nitrate', unit: 'ppm', step: '0.1' },
  { key: 'ec', label: 'EC', unit: 'µS/cm', step: '1' },
  { key: 'humidity', label: 'Humidity', unit: '%', step: '1' },
  { key: 'salinity', label: 'Salinity', unit: 'ppt', step: '0.01' },
]

const today = () => new Date().toISOString().slice(0, 10)

export function WaterQualityPage() {
  const { activeId, activeSystem } = useSystems()
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({ date: today() })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: history = [] } = useQuery({
    queryKey: ['water-quality', 'history', activeId],
    queryFn: () => fetchWaterQualityHistory(activeId as string, 10),
    enabled: !!activeId,
  })

  const mutation = useMutation({
    mutationFn: (input: WaterQualityInput) => createWaterQualityReading(activeId as string, input),
    onSuccess: () => {
      setSaved(true)
      setValues({ date: today() })
      // Refresh everything that reflects the new reading.
      qc.invalidateQueries({ queryKey: ['water-quality'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save the reading.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input: WaterQualityInput = { date: values.date || today() }
    let hasValue = false
    for (const f of FIELDS) {
      const raw = values[f.key]
      if (raw != null && raw !== '') {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          setError(`${f.label} must be a number.`)
          return
        }
        ;(input as Record<string, unknown>)[f.key] = n
        hasValue = true
      }
    }
    if (values.notes) input.notes = values.notes
    if (!hasValue) {
      setError('Enter at least one measurement.')
      return
    }
    mutation.mutate(input)
  }

  if (!activeId) return <div className="empty">Select a system to record water quality.</div>

  return (
    <div>
      <div className="dash-head">
        <h1>Water Quality</h1>
        <span className="dash-sub">{activeSystem?.system_name}</span>
      </div>

      <form className="wq-form" onSubmit={onSubmit}>
        <h2 className="section-title" style={{ marginTop: 0 }}>Record a reading</h2>
        {error && <div className="wq-error">{error}</div>}
        {saved && <div className="wq-ok">Reading saved ✓</div>}
        <div className="wq-grid">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={values.date ?? ''} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} />
          </div>
          {FIELDS.map((f) => (
            <div className="field" key={f.key}>
              <label htmlFor={f.key}>
                {f.label}
                {f.unit && <span className="unit-hint"> ({f.unit})</span>}
              </label>
              <input
                id={f.key}
                type="number"
                step={f.step}
                inputMode="decimal"
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                placeholder="—"
              />
            </div>
          ))}
          <div className="field wq-notes">
            <label htmlFor="notes">Notes</label>
            <input id="notes" type="text" value={values.notes ?? ''} onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
        <button className="btn wq-submit" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save reading'}
        </button>
      </form>

      <h2 className="section-title">Recent readings</h2>
      {history.length === 0 ? (
        <div className="empty">No readings recorded yet.</div>
      ) : (
        <div className="wq-table-wrap">
          <table className="wq-table">
            <thead>
              <tr>
                <th>Date</th>
                {FIELDS.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={i}>
                  <td>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  {FIELDS.map((f) => {
                    const v = r[f.key as keyof typeof r] as number | null
                    return <td key={f.key}>{v == null || !Number.isFinite(v) ? '—' : v}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
