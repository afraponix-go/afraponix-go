import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { logFeeding, FEED_TYPES } from './feeding'
import type { FishTank } from './api'

const today = () => new Date().toISOString().slice(0, 10)

export function FeedingModal({ systemId, tanks, onClose }: { systemId: string; tanks: FishTank[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [date, setDate] = useState(today())
  const [tankId, setTankId] = useState(tanks[0] ? String(tanks[0].fish_tank_id) : '')
  const [amount, setAmount] = useState('')
  const [feedType, setFeedType] = useState(FEED_TYPES[0])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      logFeeding(systemId, {
        date,
        fish_tank_id: Number(tankId),
        feed_consumption: Number(amount),
        feed_type: feedType || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feeding-log'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not log feeding.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!tankId) return setError('Choose a tank.')
    if (!(Number(amount) > 0)) return setError('Enter a positive feed amount.')
    mutation.mutate()
  }

  return (
    <Modal title="Log feeding" onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="feed-date">Date</label>
          <input id="feed-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="feed-tank">Tank</label>
          <select id="feed-tank" value={tankId} onChange={(e) => setTankId(e.target.value)}>
            {tanks.map((t) => (
              <option key={t.fish_tank_id} value={t.fish_tank_id}>
                Tank {t.tank_number}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="feed-amount">Feed amount <span className="unit-hint">(g)</span></label>
          <input id="feed-amount" type="number" min="0" step="1" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 250" />
        </div>
        <div className="field">
          <label htmlFor="feed-type">Feed type</label>
          <select id="feed-type" value={feedType} onChange={(e) => setFeedType(e.target.value)}>
            {FEED_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="feed-notes">Notes <span className="unit-hint">· optional</span></label>
          <input id="feed-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Log feeding'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
