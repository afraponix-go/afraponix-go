import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/apiClient'
import { fetchLatestNutrients } from '../dashboard/api'
import { logFeeding, suggestedFeed, recommendedPellet, FEED_TYPES, type FeedingRecord } from './feeding'
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

export function BulkFeedingForm({
  systemId,
  tanks,
  previousLog,
  onDone,
  onCancel,
}: {
  systemId: string
  tanks: FishTank[]
  previousLog: FeedingRecord[]
  onDone: () => void
  onCancel?: () => void
}) {
  const qc = useQueryClient()
  const [date, setDate] = useState(today())
  // Latest water temperature drives the appetite side of the recommendation.
  const { data: nutrients } = useQuery({ queryKey: ['nutrients', 'latest', systemId], queryFn: () => fetchLatestNutrients(systemId) })
  const waterTemp = nutrients?.temperature?.value ?? null
  const prev = useMemo(() => previousByTank(previousLog), [previousLog])
  const [rows, setRows] = useState<Record<number, Row>>(() => {
    const init: Record<number, Row> = {}
    for (const t of tanks) {
      const p = prev.get(t.fish_tank_id)
      init[t.fish_tank_id] = { amount: p?.amount ?? '', type: p?.type ?? recommendedPellet(t.average_weight ?? 0) ?? FEED_TYPES[0] }
    }
    return init
  })
  const [error, setError] = useState<string | null>(null)

  const setRow = (id: number, patch: Partial<Row>) => setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }))

  // Quick entry: the feed amount inputs form a keyboard column. Tab skips the
  // recommendation chip + type select (they're tabIndex=-1), and Enter jumps to
  // the next tank's amount so you can rattle through every tank without a mouse.
  const feedRefs = useRef<(HTMLInputElement | null)[]>([])
  const sortedTanks = useMemo(() => tanks.slice().sort((a, b) => a.tank_number - b.tank_number), [tanks])
  function onFeedKey(e: React.KeyboardEvent<HTMLInputElement>, i: number) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const next = feedRefs.current[i + 1]
      if (next) { next.focus(); next.select() }
      else e.currentTarget.blur()
    }
  }

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
      onDone()
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
      <p className="feed-temp-note">
        {waterTemp != null
          ? `Ration = biomass × size-based rate × temperature response (water ${waterTemp.toFixed(1)}°C, per species). Hover a chip for pellet size & feeds/day.`
          : 'No recent water-temp reading — recommendations assume optimal temperature. Hover a chip for pellet size & feeds/day.'}
      </p>

      <div className="feed-rows">
        <div className="feed-row feed-row-head">
          <span>Tank</span>
          <span>Feed (g)</span>
          <span>Rec.</span>
          <span>Type</span>
        </div>
        {sortedTanks
          .map((t, i) => {
            const rec = suggestedFeed(t.current_count, t.average_weight, t.tank_fish_type, waterTemp)
            const recTitle =
              rec.grams > 0
                ? `Recommended ${rec.grams} g/day (${rec.ratePct.toFixed(1)}% body weight) · ${rec.pellet} · ${rec.frequency}×/day${rec.note ? ` — ${rec.note}` : ''}. Click to use.`
                : 'No fish/weight data'
            return (
              <div className="feed-row" key={t.fish_tank_id}>
                <span className="feed-tank-name">Tank {t.tank_number}</span>
                <input
                  ref={(el) => { feedRefs.current[i] = el }}
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  value={rows[t.fish_tank_id]?.amount ?? ''}
                  onChange={(e) => setRow(t.fish_tank_id, { amount: e.target.value })}
                  onKeyDown={(e) => onFeedKey(e, i)}
                  placeholder={rec.grams > 0 ? String(rec.grams) : '—'}
                  aria-label={`Feed for tank ${t.tank_number}`}
                />
                {rec.grams > 0 ? (
                  <button type="button" tabIndex={-1} className={`feed-rec${rec.factor < 0.95 ? ' reduced' : ''}`} onClick={() => setRow(t.fish_tank_id, { amount: String(rec.grams) })} title={recTitle}>
                    {rec.grams} g
                  </button>
                ) : (
                  <span className="feed-rec-none">—</span>
                )}
                <select tabIndex={-1} value={rows[t.fish_tank_id]?.type ?? FEED_TYPES[0]} onChange={(e) => setRow(t.fish_tank_id, { type: e.target.value })} aria-label={`Feed type for tank ${t.tank_number}`}>
                  {(() => {
                    const cur = rows[t.fish_tank_id]?.type
                    const opts = cur && !FEED_TYPES.includes(cur) ? [cur, ...FEED_TYPES] : FEED_TYPES
                    return opts.map((ft) => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))
                  })()}
                </select>
              </div>
            )
          })}
      </div>

      <div className="mform-actions">
        {onCancel && (
          <button type="button" className="ghost" onClick={onCancel}>Cancel</button>
        )}
        <button type="submit" className="btn" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : `Save feeding (${toSave.length} tank${toSave.length === 1 ? '' : 's'})`}
        </button>
      </div>
    </form>
  )
}
