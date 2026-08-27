import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchFarms, updateFarm, deleteFarm, type Farm } from '../systems/farmApi'
import '../fish/fish.css'
import './settings.css'

// Manage your farms: rename them, or permanently delete a farm and all of its
// data (every system in it, with readings, plantings, harvests and programmes).
export function ManageFarms() {
  const { data: farms = [], isLoading } = useQuery({ queryKey: ['farms'], queryFn: fetchFarms })
  const [renaming, setRenaming] = useState<Farm | null>(null)
  const [deleting, setDeleting] = useState<Farm | null>(null)

  const owned = farms.filter((f) => f.kind !== 'shared')

  return (
    <div className="set-card wide">
      <h2 className="set-title">Manage farms</h2>
      <p className="set-sub">Rename a farm, or permanently delete it and everything in it.</p>

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : owned.length === 0 ? (
        <div className="empty">You don't own any farms yet.</div>
      ) : (
        <div className="mf-list">
          {owned.map((f) => {
            const count = f.system_count ?? 0
            return (
              <div key={f.id} className="danger-row">
                <div>
                  <div className="danger-row-title">{f.name}</div>
                  <div className="danger-row-sub">{count} system{count === 1 ? '' : 's'}{f.location ? ` · ${f.location}` : ''}</div>
                </div>
                <div className="mf-actions">
                  <button className="btn ghost" type="button" onClick={() => setRenaming(f)}>Rename</button>
                  <button className="btn btn-danger" type="button" onClick={() => setDeleting(f)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {renaming && <RenameFarmModal farm={renaming} onClose={() => setRenaming(null)} />}
      {deleting && <DeleteFarmModal farm={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}

function RenameFarmModal({ farm, onClose }: { farm: Farm; onClose: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState(farm.name)
  const [error, setError] = useState<string | null>(null)
  const mut = useMutation({
    mutationFn: () => updateFarm(farm.id, { name: name.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farms'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not rename the farm.'),
  })
  return (
    <Modal title={`Rename ${farm.name}`} onClose={onClose}>
      <form className="mform" onSubmit={(e) => { e.preventDefault(); setError(null); if (!name.trim()) return setError('Enter a name.'); mut.mutate() }}>
        {error && <div className="set-error">{error}</div>}
        <div className="field">
          <label htmlFor="mf-name">Farm name</label>
          <input id="mf-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div className="mform-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

function DeleteFarmModal({ farm, onClose }: { farm: Farm; onClose: () => void }) {
  const qc = useQueryClient()
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const count = farm.system_count ?? 0
  const mut = useMutation({
    mutationFn: () => deleteFarm(farm.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farms'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not delete the farm.'),
  })
  return (
    <Modal title="Delete farm" onClose={onClose}>
      <div className="mform">
        {error && <div className="set-error">{error}</div>}
        <p className="set-sub" style={{ marginTop: 0 }}>
          This permanently deletes <b>{farm.name}</b> and <b>all of its data</b>
          {count > 0 ? ` — its ${count} system${count === 1 ? '' : 's'}, plus every reading, planting, harvest and programme` : ''}. This cannot be undone.
        </p>
        <p className="set-sub" style={{ marginTop: 0 }}>To confirm, type the farm name <b>{farm.name}</b> below.</p>
        <div className="field">
          <label htmlFor="mf-confirm">Farm name</label>
          <input id="mf-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
        <div className="mform-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" disabled={typed.trim() !== farm.name || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
