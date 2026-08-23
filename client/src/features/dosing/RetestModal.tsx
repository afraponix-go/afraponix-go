import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { recordRetest, nutrientShort, type DosingLogEntry } from './api'
import './dosing.css'

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

// Record the after-reading for a logged dose, which computes recovery %.
export function RetestModal({ entry, onClose }: { entry: DosingLogEntry; onClose: () => void }) {
  const qc = useQueryClient()
  const [after, setAfter] = useState(entry.reading_after != null ? String(entry.reading_after) : '')
  const [date, setDate] = useState(entry.retest_date ?? todayISO())
  const [error, setError] = useState<string | null>(null)

  const afterN = after.trim() === '' ? null : Number(after)
  const observed = afterN != null && entry.reading_before != null ? afterN - entry.reading_before : null
  const recovery = observed != null && entry.expected_delta != null && entry.expected_delta !== 0 ? Math.round((observed / entry.expected_delta) * 100) : null

  const mut = useMutation({
    mutationFn: () => recordRetest(entry.id, afterN, date || null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dosing-log'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save the re-test.'),
  })

  function onSubmit(e: FormEvent) { e.preventDefault(); setError(null); mut.mutate() }

  const nut = nutrientShort(entry.target_nutrient ?? 'n')

  return (
    <Modal title={`Re-test · ${nut}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <p className="dz-hint">
          Dosed {entry.event_date} · {nut} before <b>{entry.reading_before ?? '—'}</b> ppm
          {entry.expected_delta != null ? <> · expected Δ <b>{Number(entry.expected_delta)}</b> ppm</> : null}
        </p>
        <div className="field-row">
          <div className="field">
            <label htmlFor="rt-after">{nut} after <span className="unit-hint">(ppm)</span></label>
            <input id="rt-after" type="number" step="any" inputMode="decimal" value={after} onChange={(e) => setAfter(e.target.value)} placeholder="re-test reading" autoFocus />
          </div>
          <div className="field">
            <label htmlFor="rt-date">Re-test date</label>
            <input id="rt-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        {observed != null && (
          <p className="dz-hint">Observed Δ <b>{observed > 0 ? '+' : ''}{Math.round(observed * 10) / 10}</b> ppm{recovery != null ? <> · recovery <b>{recovery}%</b></> : null}</p>
        )}
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Save re-test'}</button>
        </div>
      </form>
    </Modal>
  )
}
