import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { logFeeding, FEED_TYPES, type FeedingRecord } from './feeding'
import type { FishTank } from './api'

const today = () => new Date().toISOString().slice(0, 10)

type Row = { amount: string; type: string }

// Most recent feed amount + type per tank, to pre-populate the bulk form.
function previousByTank(log: FeedingRecord[]): Map<number, { amount: string; type: string }> {
  const map = new Map<number, { amount: string; type: string }>()
  for (const r of log) {
    if (r.fish_tank_id == null || map.has(r.fish_tank_id)) continue // log is newest-first
    map.set(r.fish_tank_id, {
      amount: r.feed_consumption != null ? String(r.feed_consumption) : '',
      type: r.feed_type || FEED_TYPES[0],
    })
  }
  return map
}

export function FeedingModal({
  systemId,
  tanks,
  previousLog,
  onClose,
}: {
  systemId: string
  tanks: FishTank[]
  previousLog: FeedingRecord[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [date, setDate] = useState(today())
  const prev = useMemo(() => previousByTank(previousLog), [previousLog])
  const [rows, setRows] = useState<Record<number, Row>>(() => {
    const init: Record<number, Row> = {}
    for (const t of tanks) {
      const p = prev.get(t.fish_tank_id)
      init[t.fish_tank_id] = { amount: p?.amount ?? '', type: p?.type ?? FEED_TYPES[0] }
    }
    return init
  })
  const [error, setError] = useState<string | null>(null)

  const setRow = (id: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }))

  // Apply each tank's previous feeding to the whole form ("copy previous day").
  function copyPrevious() {
    setRows((r) => {
      const next = { ...r }
      for (const t of tanks) {
        const p = prev.get(t.fish_tank_id)
        if (p) next[t.fish_tank_id] = { amount: p.amount, type: p.type }
      }
      return next
    })
  }

  const toSave = tanks.filter((t) => Number(rows[t.fish_tank_id]?.amount) > 0)

  const mutation = useMutation({
    mutationFn: () =>
      Promise.all(
        toSave.map((t) =>
          logFeeding(systemId, {
            date,
            fish_tank_id: t.fish_tank_id,
            feed_consumption: Number(rows[t.fish_tank_id].amount),
            feed_type: rows[t.fish_tank_id].type || undefined,
          }),
        ),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feeding-log'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save feeding.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (toSave.length === 0) return setError('Enter a feed amount for at least one tank.')
    mutation.mutate()
  }

  return (
    <Modal title="Log feeding — all tanks" onClose={onClose} wide>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="feed-bulk-top">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="feed-date">Date</label>
            <input id="feed-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {prev.size > 0 && (
            <button type="button" className="ghost feed-copy" onClick={copyPrevious} title="Fill every tank with its last feeding">
              ↺ Copy previous
            </button>
          )}
        </div>

        <div className="feed-rows">
          <div className="feed-row feed-row-head">
            <span>Tank</span>
            <span>Feed (g)</span>
            <span>Type</span>
          </div>
          {tanks
            .slice()
            .sort((a, b) => a.tank_number - b.tank_number)
            .map((t) => (
              <div className="feed-row" key={t.fish_tank_id}>
                <span className="feed-tank-name">Tank {t.tank_number}</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={rows[t.fish_tank_id]?.amount ?? ''}
                  onChange={(e) => setRow(t.fish_tank_id, { amount: e.target.value })}
                  placeholder="—"
                  aria-label={`Feed for tank ${t.tank_number}`}
                />
                <select value={rows[t.fish_tank_id]?.type ?? FEED_TYPES[0]} onChange={(e) => setRow(t.fish_tank_id, { type: e.target.value })} aria-label={`Feed type for tank ${t.tank_number}`}>
                  {(() => {
                    const cur = rows[t.fish_tank_id]?.type
                    const opts = cur && !FEED_TYPES.includes(cur) ? [cur, ...FEED_TYPES] : FEED_TYPES
                    return opts.map((ft) => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))
                  })()}
                </select>
              </div>
            ))}
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : `Save feeding (${toSave.length} tank${toSave.length === 1 ? '' : 's'})`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
