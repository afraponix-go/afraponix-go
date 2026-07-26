import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { deleteSystem, isOwnedSystem } from '../systems/api'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import '../fish/fish.css'
import '../dashboard/dashboard.css'
import './settings.css'

export function DangerZone() {
  const { activeId, activeSystem } = useSystems()
  const qc = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)

  const name = activeSystem?.system_name ?? ''

  const mutation = useMutation({
    mutationFn: () => deleteSystem(activeId as string),
    onSuccess: () => {
      // The systems list is refetched; SystemContext then reselects a remaining
      // system (or clears the active one if none are left).
      qc.invalidateQueries({ queryKey: ['systems'] })
      setConfirming(false)
      setTyped('')
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not delete the system.'),
  })

  if (!activeId) return <div className="empty">Select a system first.</div>
  if (!isOwnedSystem(activeSystem)) return <div className="empty">Only the owner can delete this system.</div>

  return (
    <div className="set-card danger">
      <h2 className="set-title">Danger zone</h2>
      <p className="set-sub">
        Irreversible actions. Deleting a system permanently removes its fish tanks, grow beds, water-quality
        and nutrient readings, plantings, harvests and sensor configuration.
      </p>

      <div className="danger-row">
        <div>
          <div className="danger-row-title">Delete this system</div>
          <div className="danger-row-sub">
            <b>{name}</b> and all of its data will be permanently deleted.
          </div>
        </div>
        <button className="btn btn-danger" type="button" onClick={() => { setError(null); setConfirming(true) }}>
          Delete system
        </button>
      </div>

      {confirming && (
        <Modal title="Delete system" onClose={() => setConfirming(false)}>
          <div className="mform">
            {error && <div className="set-error">{error}</div>}
            <p className="set-sub" style={{ marginTop: 0 }}>
              This cannot be undone. To confirm, type the system name <b>{name}</b> below.
            </p>
            <div className="field">
              <label htmlFor="confirm-name">System name</label>
              <input id="confirm-name" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </div>
            <div className="mform-actions">
              <button className="btn ghost" type="button" onClick={() => setConfirming(false)}>Cancel</button>
              <button
                className="btn btn-danger"
                type="button"
                disabled={typed.trim() !== name || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
