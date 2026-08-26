import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { saveFishTank, FISH_SPECIES, type FishTank } from './api'

// Add or edit a single fish tank. On add the next free tank number is
// pre-filled; on edit the number is fixed (it keys the record server-side).
export function TankConfigModal({
  systemId,
  tank,
  existingTankNumbers,
  onClose,
}: {
  systemId: string
  tank?: FishTank
  existingTankNumbers: number[]
  onClose: () => void
}) {
  const qc = useQueryClient()
  const editing = !!tank
  const nextNum = Math.max(0, ...existingTankNumbers) + 1

  const [num, setNum] = useState(editing ? String(tank!.tank_number) : String(nextNum))
  const [species, setSpecies] = useState((tank?.tank_fish_type ?? 'tilapia').toLowerCase())
  const [volume, setVolume] = useState(
    tank?.volume_liters != null ? String(tank.volume_liters) : tank?.size_m3 != null ? String(tank.size_m3 * 1000) : '',
  )
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => saveFishTank(systemId, { tank_number: Number(num), volume_liters: Number(volume), fish_type: species }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fish-inventory'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const tankNumber = Number(num)
    if (!Number.isInteger(tankNumber) || tankNumber < 1) return setError('Tank number must be a positive whole number.')
    if (!editing && existingTankNumbers.includes(tankNumber)) return setError(`Tank ${tankNumber} already exists — pick another number.`)
    if (!(Number(volume) > 0)) return setError('Enter the tank volume in litres.')
    mutation.mutate()
  }

  const sizeM3 = Number(volume) > 0 ? Number(volume) / 1000 : 0

  return (
    <Modal title={editing ? `Edit Tank ${tank!.tank_number}` : 'Add fish tank'} onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field-row">
          <div className="field">
            <label htmlFor="tk-num">Tank number</label>
            <input id="tk-num" type="number" min="1" step="1" inputMode="numeric" value={num} onChange={(e) => setNum(e.target.value)} disabled={editing} />
          </div>
          <div className="field">
            <label htmlFor="tk-sp">Species</label>
            <select id="tk-sp" value={species} onChange={(e) => setSpecies(e.target.value)}>
              {FISH_SPECIES.map((f) => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="tk-vol">Volume <span className="unit-hint">(L)</span></label>
          <input id="tk-vol" type="number" min="0" step="any" inputMode="decimal" value={volume} onChange={(e) => setVolume(e.target.value)} placeholder="e.g. 6000" autoFocus />
        </div>

        <div className="bed-calc">
          <span><b>{sizeM3 ? sizeM3.toFixed(1) : '0'}</b> m³</span>
        </div>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save tank' : 'Add tank'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
