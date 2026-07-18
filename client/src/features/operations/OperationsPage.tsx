import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { ApiError } from '../../lib/apiClient'
import { createOperation, fetchOperations, OPERATION_TYPES, OP_FIELDS, OP_FIELD_META, type OperationInput, type OpField } from './api'
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

  // Changing the operation type resets contextual fields so stale values from a
  // previous type are never submitted, and only the relevant fields show.
  const setOperation = (op: string) => setForm((f) => ({ date: f.date, operation_type: op, notes: f.notes ?? '' }))

  const shownFields: OpField[] = OP_FIELDS[form.operation_type] ?? []

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
    for (const key of shownFields) {
      const raw = form[key]
      if (!raw) continue
      const meta = OP_FIELD_META[key]
      if (meta.kind === 'number') {
        const n = Number(raw)
        if (!Number.isFinite(n)) return setError(`${meta.label} must be a number.`)
        ;(input as Record<string, unknown>)[key] = n
      } else {
        ;(input as Record<string, unknown>)[key] = raw
      }
    }
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
            <select id="operation_type" className="op-select" value={form.operation_type ?? ''} onChange={(e) => setOperation(e.target.value)}>
              {OPERATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {shownFields.map((key) => {
            const meta = OP_FIELD_META[key]
            return (
              <div className="field" key={key}>
                <label htmlFor={key}>
                  {meta.label}
                  {meta.unit && <span className="unit-hint"> ({meta.unit})</span>}
                </label>
                <input
                  id={key}
                  type={meta.kind === 'number' ? 'number' : 'text'}
                  step={meta.step}
                  inputMode={meta.kind === 'number' ? 'decimal' : undefined}
                  value={form[key] ?? ''}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={meta.placeholder}
                />
              </div>
            )
          })}
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
