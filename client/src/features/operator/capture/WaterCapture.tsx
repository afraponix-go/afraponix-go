import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../../lib/apiClient'
import { createWaterQualityReading, WATER_FIELDS, parseTrackedMetrics, type WaterFieldKey } from '../../water/api'
import { useCaptureSystem } from '../useCaptureSystem'
import { CaptureSystemSwitch } from '../CaptureSystemSwitch'
import '../../water/water.css'
import '../../plants/scan.css'

const today = () => new Date().toISOString().slice(0, 10)

// The operator's Water tile: just "record a reading" — no history table, no
// edit/delete of past days. The full admin Water Quality page keeps those.
export function WaterCapture() {
  const { systems, systemId, system, setActiveId } = useCaptureSystem()
  const qc = useQueryClient()
  const tracked = parseTrackedMetrics(system?.tracked_metrics)
  const fields = WATER_FIELDS.filter((f) => tracked.has(f.key))
  const [values, setValues] = useState<Record<string, string>>({ date: today() })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const mutation = useMutation({
    mutationFn: (input: { date: string; notes?: string; values: Partial<Record<WaterFieldKey, number>> }) =>
      createWaterQualityReading(systemId as string, input),
    onSuccess: () => {
      setSaved(true)
      setValues({ date: today() })
      qc.invalidateQueries({ queryKey: ['nutrients'] })
      qc.invalidateQueries({ queryKey: ['water-quality'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save the reading.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed: Partial<Record<WaterFieldKey, number>> = {}
    let hasValue = false
    for (const f of fields) {
      const raw = values[f.key]
      if (raw != null && raw !== '') {
        const n = Number(raw)
        if (!Number.isFinite(n)) return setError(`${f.label} must be a number.`)
        parsed[f.key] = n
        hasValue = true
      }
    }
    if (!hasValue) return setError('Enter at least one measurement.')
    mutation.mutate({ date: values.date || today(), notes: values.notes || undefined, values: parsed })
  }

  return (
    <div className="scan-wrap">
      <div className="scan-topline"><Link to="/log" className="link-btn">‹ Back to Log</Link></div>
      <h2 className="section-title" style={{ marginTop: 0 }}>Water</h2>

      <CaptureSystemSwitch systems={systems} systemId={systemId} onChange={setActiveId} />

      {!systemId ? (
        <div className="empty">No system to log a reading for.</div>
      ) : (
        <form className="wq-form" onSubmit={onSubmit}>
          {error && <div className="wq-error">{error}</div>}
          {saved && <div className="wq-ok">Reading saved ✓</div>}
          <div className="wq-grid">
            <div className="field">
              <label htmlFor="date">Date</label>
              <input id="date" type="date" value={values.date ?? ''} onChange={(e) => setValues((v) => ({ ...v, date: e.target.value }))} />
            </div>
            {fields.map((f) => (
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
                  placeholder={f.range ?? '—'}
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
      )}
    </div>
  )
}
