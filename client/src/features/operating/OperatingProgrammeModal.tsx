import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { createOperatingProgramme, updateOperatingProgramme, WEEKDAYS, WEEKDAY_LABEL, type OperatingProgramme } from './api'
import '../spray/spray.css'

type Row = { label: string; days: string[]; minutes: string }
const emptyRow = (): Row => ({ label: '', days: [], minutes: '' })

// The operating-programme builder — a list of free-text tasks, each with its
// own weekday cadence, in place of spray/dosing's shared product catalogue
// (a task like "Feed fish" or "Weigh Tank 3" doesn't need one — see routes/
// operating.js for why this is deliberately leaner than the other two types).
export function OperatingProgrammeModal({ systemId, programme, onClose }: { systemId: string; programme?: OperatingProgramme; onClose: () => void }) {
  const qc = useQueryClient()
  const editing = !!programme

  const [name, setName] = useState(programme?.name ?? '')
  const [notes, setNotes] = useState(programme?.notes ?? '')
  const [rows, setRows] = useState<Row[]>(
    programme?.tasks.length
      ? programme.tasks.map((t) => ({ label: t.label, days: t.weekdays, minutes: t.est_minutes != null ? String(t.est_minutes) : '' }))
      : [emptyRow()],
  )
  const [error, setError] = useState<string | null>(null)

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const toggleDay = (i: number, day: string) => setRow(i, { days: rows[i].days.includes(day) ? rows[i].days.filter((d) => d !== day) : [...rows[i].days, day] })
  const addRow = () => setRows((rs) => [...rs, emptyRow()])
  const removeRow = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : rs))

  const mut = useMutation({
    mutationFn: () => {
      const tasks = rows
        .filter((r) => r.label.trim())
        .map((r) => ({ label: r.label.trim(), weekdays: r.days, est_minutes: r.minutes.trim() ? Number(r.minutes) : null }))
      const input = { name: name.trim(), notes: notes.trim() || null, tasks }
      return editing ? updateOperatingProgramme(programme!.id, input) : createOperatingProgramme(systemId, input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operating-programmes'] })
      qc.invalidateQueries({ queryKey: ['operating-due'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Give the programme a name.')
    const withLabels = rows.filter((r) => r.label.trim())
    if (withLabels.length === 0) return setError('Add at least one task.')
    if (withLabels.some((r) => r.days.length === 0)) return setError('Give every task at least one day.')
    mut.mutate()
  }

  return (
    <Modal title={editing ? `Edit ${programme?.name}` : 'New operating programme'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="op-name">Programme name</label>
          <input id="op-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Daily fish care" autoFocus />
        </div>

        <label className="field-label">Tasks</label>
        <div className="pm-products">
          {rows.map((r, i) => (
            <div key={i} className="pm-prod on">
              <div className="pm-prod-main" style={{ gap: 8 }}>
                <input
                  type="text"
                  value={r.label}
                  onChange={(e) => setRow(i, { label: e.target.value })}
                  placeholder="e.g. Feed fish"
                  style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', font: 'inherit', background: 'var(--surface)', color: 'var(--ink)' }}
                />
                <button type="button" className="tray-x" onClick={() => removeRow(i)} disabled={rows.length === 1} aria-label="Remove task">×</button>
              </div>
              <div className="pm-prod-cfg">
                <div className="pm-days">
                  {WEEKDAYS.map((d) => (
                    <button key={d} type="button" className={r.days.includes(d) ? 'on' : ''} onClick={() => toggleDay(i, d)}>{WEEKDAY_LABEL[d]}</button>
                  ))}
                </div>
                <input
                  className="pm-rate"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={r.minutes}
                  onChange={(e) => setRow(i, { minutes: e.target.value })}
                  placeholder="mins · optional"
                />
              </div>
            </div>
          ))}
          <button type="button" className="link-btn" onClick={addRow} style={{ marginTop: 4 }}>+ Add task</button>
        </div>

        <div className="field">
          <label htmlFor="op-notes">Notes</label>
          <textarea id="op-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save programme' : 'Create programme'}</button>
        </div>
      </form>
    </Modal>
  )
}
