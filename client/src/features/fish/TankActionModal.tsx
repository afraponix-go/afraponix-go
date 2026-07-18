import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { addFish, recordMortality, updateWeight, MORTALITY_CAUSES } from './actions'
import type { FishTank } from './api'

export type TankAction = 'add' | 'mortality' | 'weight'

const TITLES: Record<TankAction, string> = {
  add: 'Add fish',
  mortality: 'Record loss',
  weight: 'Update weight',
}

export function TankActionModal({
  systemId,
  tank,
  action,
  onClose,
}: {
  systemId: string
  tank: FishTank
  action: TankAction
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [count, setCount] = useState('')
  const [weight, setWeight] = useState(action === 'weight' && tank.average_weight != null ? String(tank.average_weight) : '')
  const [cause, setCause] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      if (action === 'add') return addFish(systemId, tank.fish_tank_id, { count: Number(count), average_weight: weight ? Number(weight) : undefined, notes: notes || undefined })
      if (action === 'mortality') return recordMortality(systemId, tank.fish_tank_id, { count: Number(count), cause: cause || undefined, notes: notes || undefined })
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
    if ((action === 'add' || action === 'mortality') && !(Number(count) > 0)) return setError('Enter a positive number of fish.')
    if (action === 'weight' && !(Number(weight) > 0)) return setError('Enter a positive weight.')
    if (action === 'mortality' && Number(count) > (tank.current_count ?? 0)) return setError(`Only ${tank.current_count ?? 0} fish in this tank.`)
    mutation.mutate()
  }

  return (
    <Modal title={`${TITLES[action]} — Tank ${tank.tank_number}`} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        {(action === 'add' || action === 'mortality') && (
          <div className="field">
            <label htmlFor="count">Number of fish{action === 'mortality' ? ' lost' : ''}</label>
            <input id="count" type="number" min="1" step="1" inputMode="numeric" autoFocus value={count} onChange={(e) => setCount(e.target.value)} placeholder={action === 'mortality' ? `up to ${tank.current_count ?? 0}` : 'e.g. 100'} />
          </div>
        )}

        {(action === 'add' || action === 'weight') && (
          <div className="field">
            <label htmlFor="weight">Average weight <span className="unit-hint">(g){action === 'add' ? ' · optional' : ''}</span></label>
            <input id="weight" type="number" min="0" step="1" inputMode="decimal" autoFocus={action === 'weight'} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 50" />
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
