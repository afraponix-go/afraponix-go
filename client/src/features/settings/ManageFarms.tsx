import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchFarms, fetchArchivedFarms, updateFarm, deleteFarm, restoreFarm, purgeFarm, type Farm, type ArchivedFarm } from '../systems/farmApi'
import { useSystems } from '../systems/SystemContext'
import '../fish/fish.css'
import './settings.css'

// Manage your farms: rename them, archive (soft-delete, recoverable), and from
// the archived list restore or permanently delete a farm and all its data.
export function ManageFarms() {
  const { allSystems } = useSystems()
  const { data: farms = [], isLoading } = useQuery({ queryKey: ['farms'], queryFn: fetchFarms })
  const { data: archived = [] } = useQuery({ queryKey: ['farms-archived'], queryFn: fetchArchivedFarms })
  const [renaming, setRenaming] = useState<Farm | null>(null)
  const [archiving, setArchiving] = useState<Farm | null>(null)

  const owned = farms.filter((f) => f.kind !== 'shared')
  const systemNames = (farmId: string) => allSystems.filter((s) => s.farm_id === farmId).map((s) => s.system_name)

  return (
    <>
      <div className="set-card wide">
        <h2 className="set-title">Manage farms</h2>
        <p className="set-sub">Rename a farm, or delete it. Deleting archives the farm so you can restore it later.</p>

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
                    <button className="btn btn-danger" type="button" onClick={() => setArchiving(f)}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {archived.length > 0 && (
        <div className="set-card wide">
          <h2 className="set-title">Archived farms</h2>
          <p className="set-sub">Deleted farms are kept here so you can recover them. Restore one to bring it (and its systems) back, or delete it permanently.</p>
          <div className="mf-list">
            {archived.map((f) => <ArchivedRow key={f.id} farm={f} />)}
          </div>
        </div>
      )}

      {renaming && <RenameFarmModal farm={renaming} onClose={() => setRenaming(null)} />}
      {archiving && <ArchiveFarmModal farm={archiving} systems={systemNames(archiving.id)} onClose={() => setArchiving(null)} />}
    </>
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

// Soft-delete: archive the farm. Warns which systems go with it; recoverable.
function ArchiveFarmModal({ farm, systems, onClose }: { farm: Farm; systems: string[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const mut = useMutation({
    mutationFn: () => deleteFarm(farm.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['farms'] })
      qc.invalidateQueries({ queryKey: ['farms-archived'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
      onClose()
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not delete the farm.'),
  })
  return (
    <Modal title={`Delete ${farm.name}?`} onClose={onClose}>
      <div className="mform">
        {error && <div className="set-error">{error}</div>}
        {systems.length > 0 ? (
          <>
            <p className="set-sub" style={{ marginTop: 0 }}>
              This will also remove <b>{systems.length} system{systems.length === 1 ? '' : 's'}</b> in this farm, with all their readings, plantings, harvests and programmes:
            </p>
            <ul className="mf-syslist">
              {systems.map((n) => <li key={n}>{n}</li>)}
            </ul>
          </>
        ) : (
          <p className="set-sub" style={{ marginTop: 0 }}>This farm has no systems.</p>
        )}
        <div className="set-ok" style={{ marginBottom: 0 }}>Don't worry — the farm is <b>archived</b>, not erased. You can restore it any time from <b>Archived farms</b>.</div>
        <div className="mform-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-danger" disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? 'Deleting…' : 'Delete farm'}</button>
        </div>
      </div>
    </Modal>
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
