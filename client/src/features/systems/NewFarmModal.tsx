import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { createFarm, type Farm } from './farmApi'
import '../fish/fish.css'
import '../water/water.css'

// Create a new farm. On success it hands the created farm back so the caller
// can switch to it and add its first system.
export function NewFarmModal({ onCreated, onClose }: { onCreated: (farm: Farm) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const mut = useMutation({
    mutationFn: () => createFarm({ name, location: location.trim() || null }),
    onSuccess: (farm) => onCreated(farm),
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not create the farm.'),
  })

  return (
    <Modal title="New farm" onClose={onClose}>
      <form className="mform" onSubmit={(e) => { e.preventDefault(); setError(null); if (!name.trim()) return setError('Enter a name.'); mut.mutate() }}>
        {error && <div className="wq-error">{error}</div>}
        <p className="set-sub" style={{ marginTop: 0 }}>A farm holds one or more systems. You'll add its first system next.</p>
        <div className="field">
          <label htmlFor="nf-name">Farm name</label>
          <input id="nf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Farm" autoFocus />
        </div>
        <div className="field">
          <label htmlFor="nf-loc">Location <span className="unit-hint">(optional)</span></label>
          <input id="nf-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Cape Town" />
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Creating…' : 'Create farm'}</button>
        </div>
      </form>
    </Modal>
  )
}
