import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { ApiError } from '../../lib/apiClient'
import { createWaterQualityReading, deleteWaterQualityDay, fetchWaterQualityHistory, WATER_FIELDS, parseTrackedMetrics, type WaterFieldKey, type WaterQualityInput } from './api'
import { Modal } from '../../components/Modal'
import '../dashboard/dashboard.css'
import '../plants/plants.css'
import './water.css'

const today = () => new Date().toISOString().slice(0, 10)

export function WaterQualityPage() {
  const { activeId, activeSystem } = useSystems()
  // Only capture the metrics this system tracks.
  const tracked = parseTrackedMetrics(activeSystem?.tracked_metrics)
  const fields = WATER_FIELDS.filter((f) => tracked.has(f.key))
  const qc = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>({ date: today() })
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  // The day being edited (its old rows are replaced on save); paging + delete.
  const [editDate, setEditDate] = useState<string | null>(null)
  const [visible, setVisible] = useState(12)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const { data: history = [] } = useQuery({
    queryKey: ['water-quality', 'history', activeId],
    queryFn: () => fetchWaterQualityHistory(activeId as string),
    enabled: !!activeId,
  })

  const refresh = () => { qc.invalidateQueries({ queryKey: ['nutrients'] }); qc.invalidateQueries({ queryKey: ['water-quality'] }) }

  const mutation = useMutation({
    // Editing replaces the day: delete its old rows, then save the new values.
    mutationFn: async ({ input, replaceDate }: { input: WaterQualityInput; replaceDate: string | null }) => {
      if (replaceDate) await deleteWaterQualityDay(activeId as string, replaceDate)
      return createWaterQualityReading(activeId as string, input)
    },
    onSuccess: () => {
      setSaved(true)
      setValues({ date: today() })
      setEditDate(null)
      refresh()
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save the reading.'),
  })

  const del = useMutation({
    mutationFn: (date: string) => deleteWaterQualityDay(activeId as string, date),
    onSuccess: () => { refresh(); setConfirmDel(null) },
  })

  function editRow(r: (typeof history)[number]) {
    const next: Record<string, string> = { date: r.date.slice(0, 10) }
    for (const f of fields) { const v = r[f.key]; if (v != null && Number.isFinite(v)) next[f.key] = String(v) }
    setValues(next)
    setEditDate(r.date.slice(0, 10))
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const parsed: Partial<Record<WaterFieldKey, number>> = {}
    let hasValue = false
    for (const f of fields) {
      const raw = values[f.key]
      if (raw != null && raw !== '') {
        const n = Number(raw)
        if (!Number.isFinite(n)) {
          setError(`${f.label} must be a number.`)
          return
        }
        parsed[f.key] = n
        hasValue = true
      }
    }
    if (!hasValue) {
      setError('Enter at least one measurement.')
      return
    }
    mutation.mutate({ input: { date: values.date || today(), notes: values.notes || undefined, values: parsed }, replaceDate: editDate })
  }

  if (!activeId) return <div className="empty">Select a system to record water quality.</div>

  return (
    <div>
      <div className="dash-head">
        <h1>Water Quality</h1>
        <span className="dash-sub">{activeSystem?.system_name}</span>
      </div>

      <form className="wq-form" onSubmit={onSubmit}>
        <h2 className="section-title" style={{ marginTop: 0 }}>{editDate ? `Edit reading — ${new Date(`${editDate}T12:00:00`).toLocaleDateString()}` : 'Record a reading'}</h2>
        {error && <div className="wq-error">{error}</div>}
        {saved && <div className="wq-ok">Reading saved ✓</div>}
        {editDate && <div className="wq-ok" style={{ background: 'var(--accent-wash)', color: 'var(--accent)' }}>Editing this day — saving replaces its values. <button type="button" className="link-btn" onClick={() => { setEditDate(null); setValues({ date: today() }) }}>Cancel</button></div>}
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
          {mutation.isPending ? 'Saving…' : editDate ? 'Save changes' : 'Save reading'}
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
                {fields.map((f) => (
                  <th key={f.key}>{f.label}</th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, visible).map((r) => (
                <tr key={r.date}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  {fields.map((f) => {
                    const v = r[f.key]
                    return <td key={f.key}>{v == null || !Number.isFinite(v) ? '—' : v}</td>
                  })}
                  <td className="row-actions">
                    <button className="link-btn" onClick={() => editRow(r)}>Edit</button>
                    <button className="link-btn danger" onClick={() => setConfirmDel(r.date.slice(0, 10))}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length > visible && (
            <div className="load-more-row">
              <button type="button" className="ghost" onClick={() => setVisible((n) => n + 12)}>
                Load more ({history.length - visible} older)
              </button>
            </div>
          )}
        </div>
      )}

      {confirmDel && (
        <Modal title="Delete reading" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete the reading from {new Date(`${confirmDel}T12:00:00`).toLocaleDateString()}? This removes all measurements logged that day and can't be undone.
          </p>
          <div className="mform-actions">
            <button type="button" className="btn ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
