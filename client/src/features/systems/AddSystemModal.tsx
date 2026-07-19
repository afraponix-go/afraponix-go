import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { createSystem } from './api'
import { useSystems } from './SystemContext'
import '../fish/fish.css'
import '../water/water.css'
import '../plants/plants.css'

const SYSTEM_TYPES = [
  { value: 'media-bed', label: 'Media bed' },
  { value: 'dwc', label: 'Deep Water Culture (DWC)' },
  { value: 'nft', label: 'NFT' },
  { value: 'vertical', label: 'Vertical' },
  { value: 'hybrid', label: 'Hybrid' },
]
const FISH_TYPES = ['tilapia', 'trout', 'catfish', 'bass', 'other']

export function AddSystemModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { setActiveId } = useSystems()
  const [name, setName] = useState('')
  const [type, setType] = useState('media-bed')
  const [fish, setFish] = useState('tilapia')
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => createSystem({ system_name: name, system_type: type, fish_type: fish }),
    onSuccess: async (newId) => {
      await qc.invalidateQueries({ queryKey: ['systems'] })
      setActiveId(newId)
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Something went wrong.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter a system name.')
    mutation.mutate()
  }

  return (
    <Modal title="Add system" onClose={onClose}>
      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="wq-error">{error}</div>}

        <div className="field">
          <label htmlFor="as-name">System name</label>
          <input id="as-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Backyard System" autoFocus />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="as-type">System type</label>
            <select id="as-type" value={type} onChange={(e) => setType(e.target.value)}>
              {SYSTEM_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="as-fish">Fish type</label>
            <select id="as-fish" value={fish} onChange={(e) => setFish(e.target.value)}>
              {FISH_TYPES.map((f) => (
                <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        <p style={{ margin: '0 0 4px', color: 'var(--ink-faint)', fontSize: 13 }}>
          You can add grow beds and fish tanks after the system is created.
        </p>

        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mutation.isPending}>{mutation.isPending ? 'Creating…' : 'Create system'}</button>
        </div>
      </form>
    </Modal>
  )
}
