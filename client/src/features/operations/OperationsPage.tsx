import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { ApiError } from '../../lib/apiClient'
import { createOperation, fetchOperations, OPERATION_TYPES, type OperationInput } from './api'
import '../dashboard/dashboard.css'
import '../water/water.css'
import './operations.css'

const today = () => new Date().toISOString().slice(0, 10)

export function OperationsPage() {
  const { activeId, activeSystem } = useSystems()
  const qc = useQueryClient()
  const [form, setForm] = useState<Record<string, string>>({ date: today(), operation_type: OPERATION_TYPES[0] })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: history = [] } = useQuery({
    queryKey: ['operations', activeId],
    queryFn: () => fetchOperations(activeId as string),
    enabled: !!activeId,
  })

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const mutation = useMutation({
    mutationFn: (input: OperationInput) => createOperation(activeId as string, input),
    onSuccess: () => {
      setSaved(true)
      setForm({ date: today(), operation_type: OPERATION_TYPES[0] })
      qc.invalidateQueries({ queryKey: ['operations'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not log the operation.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.operation_type) {
      setError('Choose an operation type.')
      return
    }
    const input: OperationInput = { date: form.date || today(), operation_type: form.operation_type }
    if (form.water_volume) {
      const n = Number(form.water_volume)
      if (!Number.isFinite(n)) return setError('Water volume must be a number.')
      input.water_volume = n
    }
    if (form.downtime_duration) {
      const n = Number(form.downtime_duration)
      if (!Number.isFinite(n)) return setError('Downtime must be a number.')
      input.downtime_duration = n
    }
    if (form.chemical_added) input.chemical_added = form.chemical_added
    if (form.amount_added) input.amount_added = form.amount_added
    if (form.notes) input.notes = form.notes
    mutation.mutate(input)
  }

  if (!activeId) return <div className="empty">Select a system to log operations.</div>

  return (
    <div>
      <div className="dash-head">
        <h1>Operations</h1>
        <span className="dash-sub">{activeSystem?.system_name}</span>
      </div>

      <form className="wq-form" onSubmit={onSubmit}>
        <h2 className="section-title" style={{ marginTop: 0 }}>Log an operation</h2>
        {error && <div className="wq-error">{error}</div>}
        {saved && <div className="wq-ok">Operation logged ✓</div>}
        <div className="wq-grid">
          <div className="field">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="operation_type">Operation</label>
            <select id="operation_type" className="op-select" value={form.operation_type ?? ''} onChange={(e) => set('operation_type', e.target.value)}>
              {OPERATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="water_volume">Water changed <span className="unit-hint">(L)</span></label>
            <input id="water_volume" type="number" step="1" inputMode="decimal" value={form.water_volume ?? ''} onChange={(e) => set('water_volume', e.target.value)} placeholder="—" />
          </div>
          <div className="field">
            <label htmlFor="downtime_duration">Downtime <span className="unit-hint">(hrs)</span></label>
            <input id="downtime_duration" type="number" step="0.5" inputMode="decimal" value={form.downtime_duration ?? ''} onChange={(e) => set('downtime_duration', e.target.value)} placeholder="—" />
          </div>
          <div className="field">
            <label htmlFor="chemical_added">Chemical added</label>
            <input id="chemical_added" type="text" value={form.chemical_added ?? ''} onChange={(e) => set('chemical_added', e.target.value)} placeholder="e.g. pH Down" />
          </div>
          <div className="field">
            <label htmlFor="amount_added">Amount</label>
            <input id="amount_added" type="text" value={form.amount_added ?? ''} onChange={(e) => set('amount_added', e.target.value)} placeholder="e.g. 50 mL" />
          </div>
          <div className="field wq-notes">
            <label htmlFor="notes">Notes</label>
            <input id="notes" type="text" value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <button className="btn wq-submit" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Log operation'}
        </button>
      </form>

      <h2 className="section-title">Recent operations</h2>
      {history.length === 0 ? (
        <div className="empty">No operations logged yet.</div>
      ) : (
        <div className="wq-table-wrap">
          <table className="wq-table op-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Operation</th>
                <th>Water (L)</th>
                <th>Chemical</th>
                <th>Amount</th>
                <th>Downtime (h)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r, i) => (
                <tr key={r.id ?? i}>
                  <td>{r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td className="op-text">{r.operation_type ?? '—'}</td>
                  <td>{r.water_volume ?? '—'}</td>
                  <td className="op-text">{r.chemical_added || '—'}</td>
                  <td className="op-text">{r.amount_added || '—'}</td>
                  <td>{r.downtime_duration ?? '—'}</td>
                  <td className="op-text">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
