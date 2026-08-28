import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { FEED_TYPES, updateFeeding, deleteFeeding, type FeedingRecord } from './feeding'
import type { FishTank } from './api'

const fmtDate = (d?: string | null) => (d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString() : '—')

// Recent feedings with edit / delete, paged 10 at a time.
export function FeedingHistory({ log, tanks }: { log: FeedingRecord[]; tanks: FishTank[] }) {
  const [visible, setVisible] = useState(10)
  const [editing, setEditing] = useState<FeedingRecord | null>(null)
  const [confirmDel, setConfirmDel] = useState<FeedingRecord | null>(null)
  const qc = useQueryClient()

  const tankNo = useMemo(() => new Map(tanks.map((t) => [t.fish_tank_id, t.tank_number])), [tanks])
  const rows = useMemo(
    () => log.filter((r) => r.id != null).sort((a, b) => (b.created_at ?? b.date ?? '').localeCompare(a.created_at ?? a.date ?? '')),
    [log],
  )
  const shown = rows.slice(0, visible)

  const del = useMutation({
    mutationFn: (r: FeedingRecord) => deleteFeeding(r.id as number),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feeding-log'] }); setConfirmDel(null) },
  })

  if (rows.length === 0) return null

  return (
    <div style={{ marginTop: 26 }}>
      <h2 className="section-title">Feeding history</h2>
      <div className="wq-table-wrap">
        <table className="wq-table op-table">
          <thead>
            <tr><th>Date</th><th>Tank</th><th>Feed</th><th>Type</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.date)}</td>
                <td className="op-text">Tank {tankNo.get(r.fish_tank_id ?? -1) ?? r.fish_tank_id ?? '—'}</td>
                <td>{r.feed_consumption != null ? `${r.feed_consumption} g` : '—'}</td>
                <td className="op-text">{r.feed_type ?? '—'}</td>
                <td className="row-actions">
                  <button className="link-btn" onClick={() => setEditing(r)}>Edit</button>
                  <button className="link-btn danger" onClick={() => setConfirmDel(r)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > shown.length && (
          <div className="load-more-row">
            <button type="button" className="ghost" onClick={() => setVisible((n) => n + 10)}>
              Load more ({rows.length - shown.length} older)
            </button>
          </div>
        )}
      </div>

      {editing && <EditFeedingModal record={editing} tankNo={tankNo} onClose={() => setEditing(null)} />}
      {confirmDel && (
        <Modal title="Delete feeding" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete the {fmtDate(confirmDel.date)} feeding for Tank {tankNo.get(confirmDel.fish_tank_id ?? -1) ?? '—'}? This can't be undone.
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

function EditFeedingModal({ record, tankNo, onClose }: { record: FeedingRecord; tankNo: Map<number, number>; onClose: () => void }) {
  const qc = useQueryClient()
  const [amount, setAmount] = useState(record.feed_consumption != null ? String(record.feed_consumption) : '')
  const [type, setType] = useState(record.feed_type || FEED_TYPES[0])
  const [error, setError] = useState<string | null>(null)
  const mut = useMutation({
    mutationFn: () => updateFeeding(record.id as number, { feed_consumption: Number(amount), feed_type: type }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['feeding-log'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not update the feeding.'),
  })
  return (
    <Modal title={`Edit feeding — Tank ${tankNo.get(record.fish_tank_id ?? -1) ?? ''} · ${fmtDate(record.date)}`} onClose={onClose}>
      <form className="mform" onSubmit={(e) => { e.preventDefault(); setError(null); if (!(Number(amount) >= 0)) return setError('Enter a feed amount.'); mut.mutate() }}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field-row">
          <div className="field">
            <label htmlFor="ef-amt">Feed <span className="unit-hint">(g)</span></label>
            <input id="ef-amt" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label htmlFor="ef-type">Type</label>
            <select id="ef-type" value={type} onChange={(e) => setType(e.target.value)}>
              {(FEED_TYPES.includes(type) ? FEED_TYPES : [type, ...FEED_TYPES]).map((ft) => <option key={ft} value={ft}>{ft}</option>)}
            </select>
          </div>
        </div>
        <div className="mform-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
