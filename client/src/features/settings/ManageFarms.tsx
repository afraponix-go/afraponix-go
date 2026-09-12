import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchArchivedFarms, restoreFarm, purgeFarm, type ArchivedFarm } from '../systems/farmApi'
import '../fish/fish.css'
import './settings.css'

// Deleted (soft-deleted) farms only — renaming and deleting a farm you still
// own both live on Settings > Farms & sharing already; this page's one real
// job is getting an archived one back (or gone for good).
export function ManageFarms() {
  const { data: archived = [], isLoading } = useQuery({ queryKey: ['farms-archived'], queryFn: fetchArchivedFarms })

  return (
    <div className="set-card wide">
      <h2 className="set-title">Archived farms</h2>
      <p className="set-sub">Deleted farms are kept here so you can recover them. Restore one to bring it (and its systems) back, or delete it permanently.</p>
      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : archived.length === 0 ? (
        <div className="empty">No archived farms. Deleting a farm from Farms &amp; sharing moves it here.</div>
      ) : (
        <div className="mf-list">
          {archived.map((f) => <ArchivedRow key={f.id} farm={f} />)}
        </div>
      )}
    </div>
  )
}

function ArchivedRow({ farm }: { farm: ArchivedFarm }) {
  const qc = useQueryClient()
  const [purging, setPurging] = useState(false)
  const count = farm.system_count ?? 0
  const restore = useMutation({
    mutationFn: () => restoreFarm(farm.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farms'] })
      qc.invalidateQueries({ queryKey: ['farms-archived'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
  return (
    <div className="danger-row" style={{ background: 'var(--surface)' }}>
      <div>
        <div className="danger-row-title">{farm.name}</div>
        <div className="danger-row-sub">{count} system{count === 1 ? '' : 's'}{farm.archived_date ? ` · archived ${farm.archived_date}` : ''}</div>
      </div>
      <div className="mf-actions">
        <button className="btn" type="button" disabled={restore.isPending} onClick={() => restore.mutate()}>{restore.isPending ? 'Restoring…' : 'Restore'}</button>
        <button className="btn ghost" type="button" onClick={() => setPurging(true)}>Delete permanently</button>
      </div>
      {purging && <PurgeFarmModal farm={farm} onClose={() => setPurging(false)} />}
    </div>
  )
}

function PurgeFarmModal({ farm, onClose }: { farm: ArchivedFarm; onClose: () => void }) {
  const qc = useQueryClient()
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const count = farm.system_count ?? 0
  const mut = useMutation({
    mutationFn: () => purgeFarm(farm.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farms-archived'] }); qc.invalidateQueries({ queryKey: ['systems'] }); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not delete the farm.'),
  })
  return (
    <Modal title="Delete permanently" onClose={onClose}>
      <div className="mform">
        {error && <div className="set-error">{error}</div>}
        <p className="set-sub" style={{ marginTop: 0 }}>
          This <b>permanently</b> deletes <b>{farm.name}</b> and all of its data{count > 0 ? ` — its ${count} system${count === 1 ? '' : 's'}, plus every reading, planting, harvest and programme` : ''}. This <b>cannot be undone</b>.
        </p>
        <p className="set-sub" style={{ marginTop: 0 }}>To confirm, type the farm name <b>{farm.name}</b> below.</p>
        <div className="field">
          <label htmlFor="mf-purge">Farm name</label>
          <input id="mf-purge" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        </div>
        <div className="mform-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" disabled={typed.trim() !== farm.name || mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'Deleting…' : 'Delete permanently'}</button>
        </div>
      </div>
    </Modal>
  )
}
