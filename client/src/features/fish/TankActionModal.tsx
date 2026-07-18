import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { addFish, recordMortality, updateWeight, moveFish, harvestFish, MORTALITY_CAUSES } from './actions'
import type { FishTank } from './api'

export type TankAction = 'add' | 'mortality' | 'weight' | 'move' | 'harvest'

const TITLES: Record<TankAction, string> = {
  add: 'Add fish',
  mortality: 'Record loss',
  weight: 'Update weight',
  move: 'Move fish',
  harvest: 'Harvest',
}

export function TankActionModal({
  systemId,
  tank,
  tanks,
  action,
  onClose,
}: {
  systemId: string
  tank: FishTank
  tanks: FishTank[]
  action: TankAction
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [count, setCount] = useState('')
  const [weight, setWeight] = useState(action === 'weight' && tank.average_weight != null ? String(tank.average_weight) : '')
  const [totalWeight, setTotalWeight] = useState('')
  const [cause, setCause] = useState('')
  const [dest, setDest] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const others = tanks.filter((t) => t.fish_tank_id !== tank.fish_tank_id).sort((a, b) => a.tank_number - b.tank_number)
  const removes = action === 'mortality' || action === 'move' || action === 'harvest'
  const available = tank.current_count ?? 0

  const mutation = useMutation({
    mutationFn: () => {
      if (action === 'add') return addFish(systemId, tank.fish_tank_id, { count: Number(count), average_weight: weight ? Number(weight) : undefined, notes: notes || undefined })
      if (action === 'mortality') return recordMortality(systemId, tank.fish_tank_id, { count: Number(count), cause: cause || undefined, notes: notes || undefined })
      if (action === 'move') return moveFish(systemId, tank.fish_tank_id, { to_tank_id: Number(dest), count: Number(count), notes: notes || undefined })
      if (action === 'harvest') return harvestFish(systemId, tank.fish_tank_id, { count: Number(count), total_weight_kg: totalWeight ? Number(totalWeight) : undefined, notes: notes || undefined })
      return updateWeight(systemId, tank.fish_tank_id, { average_weight: Number(weight), notes: notes || undefined })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fish-inventory'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if ((action === 'add' || removes) && !(Number(count) > 0)) return setError('Enter a positive number of fish.')
    if (action === 'weight' && !(Number(weight) > 0)) return setError('Enter a positive weight.')
    if (removes && Number(count) > available) return setError(`Only ${available} fish in this tank.`)
    if (action === 'move' && !dest) return setError('Choose a destination tank.')
    mutation.mutate()
  }

  const avgG =
    action === 'harvest' && Number(count) > 0 && Number(totalWeight) > 0
      ? Math.round((Number(totalWeight) * 1000) / Number(count))
      : null

  return (
    <Modal title={`${TITLES[action]} — Tank ${tank.tank_number}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        {(action === 'add' || removes) && (
          <div className="field">
            <label htmlFor="count">
              Number of fish{action === 'mortality' ? ' lost' : action === 'move' ? ' to move' : action === 'harvest' ? ' harvested' : ''}
            </label>
            <input id="count" type="number" min="1" step="1" inputMode="numeric" autoFocus value={count} onChange={(e) => setCount(e.target.value)} placeholder={removes ? `up to ${available}` : 'e.g. 100'} />
          </div>
        )}

        {action === 'move' && (
          <div className="field">
            <label htmlFor="dest">Destination tank</label>
            <select id="dest" value={dest} onChange={(e) => setDest(e.target.value)}>
              <option value="">Select a tank…</option>
              {others.map((t) => (
                <option key={t.fish_tank_id} value={t.fish_tank_id}>
                  Tank {t.tank_number}
                  {t.tank_fish_type ? ` · ${t.tank_fish_type}` : ''} ({t.current_count ?? 0} fish)
                </option>
              ))}
            </select>
          </div>
        )}

        {(action === 'add' || action === 'weight') && (
          <div className="field">
            <label htmlFor="weight">
              Average weight <span className="unit-hint">(g){action === 'add' ? ' · optional' : ''}</span>
            </label>
            <input id="weight" type="number" min="0" step="any" inputMode="decimal" autoFocus={action === 'weight'} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 50" />
          </div>
        )}

        {action === 'harvest' && (
          <div className="field">
            <label htmlFor="total">Total harvest weight <span className="unit-hint">(kg) · optional</span></label>
            <input id="total" type="number" min="0" step="any" inputMode="decimal" value={totalWeight} onChange={(e) => setTotalWeight(e.target.value)} placeholder="e.g. 12.5" />
            {avgG != null && <div className="unit-hint" style={{ marginTop: 6 }}>Average ≈ {avgG} g/fish</div>}
          </div>
        )}

        {action === 'mortality' && (
          <div className="field">
            <label htmlFor="cause">Cause <span className="unit-hint">· optional</span></label>
            <select id="cause" value={cause} onChange={(e) => setCause(e.target.value)}>
              <option value="">Not specified</option>
              {MORTALITY_CAUSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="notes">Notes <span className="unit-hint">· optional</span></label>
          <input id="notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className={`btn ${action === 'mortality' ? 'btn-danger' : ''}`} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : TITLES[action]}
          </button>
        </div>
      </form>
    </Modal>
  )
}
