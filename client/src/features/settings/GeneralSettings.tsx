import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSettingsSystem } from './settingsSystem'
import { updateSystem, isOwnedSystem } from '../systems/api'
import { ApiError } from '../../lib/apiClient'
import '../fish/fish.css'
import '../dashboard/dashboard.css'
import './settings.css'

const SYSTEM_TYPES = [
  { value: 'aquaponics', label: 'Aquaponics' },
  { value: 'media-bed', label: 'Media Bed' },
  { value: 'nft', label: 'NFT (Nutrient Film Technique)' },
  { value: 'dwc', label: 'DWC (Deep Water Culture)' },
  { value: 'hybrid', label: 'Hybrid System' },
]

export function GeneralSettings() {
  const { systemId: activeId, system: activeSystem } = useSettingsSystem()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState('aquaponics')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the form from the active system, and re-seed when it changes.
  useEffect(() => {
    if (!activeSystem) return
    setName(activeSystem.system_name ?? '')
    setType(activeSystem.system_type ?? 'aquaponics')
  }, [activeSystem])

  const mutation = useMutation({
    mutationFn: () => updateSystem(activeId as string, { system_name: name, system_type: type }),
    onSuccess: () => {
      setSaved(true)
      qc.invalidateQueries({ queryKey: ['systems'] })
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save changes.'),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter a system name.')
    mutation.mutate()
  }

  if (!activeId) return <div className="empty">No systems in this farm yet. Add one from the “+” in the header.</div>

  const owner = isOwnedSystem(activeSystem)

  return (
    <div className="set-card">
      <h2 className="set-title">System details</h2>
      <p className="set-sub">
        {owner
          ? 'Rename this system or change its type. Tanks and beds are configured under Plants → Beds and the system wizard.'
          : 'This system was shared with you. Only its owner can change these details.'}
      </p>

      <form className="mform" onSubmit={onSubmit}>
        {error && <div className="set-error">{error}</div>}
        {saved && <div className="set-ok">Saved ✓</div>}

        <div className="field">
          <label htmlFor="sys-name">System name</label>
          <input id="sys-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!owner} />
        </div>

        <div className="field">
          <label htmlFor="sys-type">System type</label>
          <select id="sys-type" value={type} onChange={(e) => setType(e.target.value)} disabled={!owner}>
            {SYSTEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {owner && (
          <div className="mform-actions">
            <button className="btn" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
