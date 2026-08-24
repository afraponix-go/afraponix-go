import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchFarms, createFarm, updateFarm, deleteFarm, type Farm } from '../systems/farmApi'
import { useSystems } from '../systems/SystemContext'
import '../fish/fish.css'
import '../plants/plants.css'

export function FarmsSettings() {
  const qc = useQueryClient()
  const { activeFarmId, setActiveFarmId } = useSystems()
  const { data: farms = [], isLoading } = useQuery({ queryKey: ['farms'], queryFn: fetchFarms })
  const [modal, setModal] = useState<{ farm?: Farm } | null>(null)
  const [confirmDel, setConfirmDel] = useState<Farm | null>(null)

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['farms'] }); qc.invalidateQueries({ queryKey: ['systems'] }) }
  const del = useMutation({ mutationFn: (f: Farm) => deleteFarm(f.id), onSuccess: () => { invalidate(); setConfirmDel(null) } })

  return (
    <div>
      <div className="feed-head">
        <h2 className="section-title" style={{ margin: 0 }}>Farms</h2>
        <button className="btn feed-btn" onClick={() => setModal({})}>+ New farm</button>
      </div>
      <p style={{ margin: '0 0 16px', color: 'var(--ink-faint)', fontSize: 13, maxWidth: '60ch' }}>
        A farm groups your aquaponics systems. When you have more than one, a farm switcher appears in the header. New systems are added to the farm you're currently in.
      </p>

      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : farms.length === 0 ? (
        <div className="empty">No farms yet.</div>
      ) : (
        <div className="op-list">
          {farms.map((f) => {
            const count = f.system_count ?? 0
            return (
              <div key={f.id} className="op-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {f.name}
                    {f.id === activeFarmId && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', borderRadius: 999, padding: '1px 8px' }}>Active</span>
                    )}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                    {count} system{count === 1 ? '' : 's'}{f.location ? ` · ${f.location}` : ''}
                  </span>
                </div>
                <span className="crop-card-actions">
                  {f.id !== activeFarmId && <button className="link-btn" onClick={() => setActiveFarmId(f.id)}>Switch to</button>}
                  <button className="link-btn" onClick={() => setModal({ farm: f })}>Rename</button>
                  <button className="link-btn danger" disabled={count > 0} title={count > 0 ? 'Move or remove its systems first' : undefined} onClick={() => setConfirmDel(f)}>Delete</button>
                </span>
              </div>
            )
          })}
        </div>
      )}

      {modal && <FarmModal farm={modal.farm} onClose={() => setModal(null)} onSaved={invalidate} />}
      {confirmDel && (
        <Modal title="Delete farm" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>Delete <b>{confirmDel.name}</b>? This can't be undone.</p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FarmModal({ farm, onClose, onSaved }: { farm?: Farm; onClose: () => void; onSaved: () => void }) {
  const editing = !!farm
  const [name, setName] = useState(farm?.name ?? '')
  const [location, setLocation] = useState(farm?.location ?? '')
  const [error, setError] = useState<string | null>(null)
  const mut = useMutation({
    mutationFn: () =>
      editing
        ? updateFarm(farm!.id, { name: name.trim(), location: location.trim() || null })
        : createFarm({ name, location: location.trim() || null }),
    onSuccess: () => { onSaved(); onClose() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not save the farm.'),
  })
  return (
    <Modal title={editing ? `Rename ${farm?.name}` : 'New farm'} onClose={onClose}>
      <form className="mform" onSubmit={(e) => { e.preventDefault(); setError(null); if (!name.trim()) return setError('Enter a name.'); mut.mutate() }}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="farm-name">Name</label>
          <input id="farm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Riverside Farm" autoFocus />
        </div>
        <div className="field">
          <label htmlFor="farm-loc">Location <span className="unit-hint">(optional)</span></label>
          <input id="farm-loc" value={location ?? ''} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Cape Town" />
        </div>
        <div className="mform-actions">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={mut.isPending}>{mut.isPending ? 'Saving…' : editing ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  )
}
