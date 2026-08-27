import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import { fetchFarms, createFarm, updateFarm, deleteFarm, fetchFarmShares, inviteToFarm, updateFarmSharePermission, removeFarmShare, type Farm } from '../systems/farmApi'
import { useSystems } from '../systems/SystemContext'
import '../fish/fish.css'
import '../plants/plants.css'

export function FarmsSettings() {
  const qc = useQueryClient()
  const { activeFarmId, setActiveFarmId } = useSystems()
  const { data: farms = [], isLoading } = useQuery({ queryKey: ['farms'], queryFn: fetchFarms })
  const [modal, setModal] = useState<{ farm?: Farm } | null>(null)
  const [confirmDel, setConfirmDel] = useState<Farm | null>(null)
  const [sharing, setSharing] = useState<Farm | null>(null)

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
            const shared = f.kind === 'shared'
            return (
              <div key={f.id} className="op-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {f.name}
                    {f.id === activeFarmId && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 14%, transparent)', borderRadius: 999, padding: '1px 8px' }}>Active</span>
                    )}
                    {shared && (
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-faint)', background: 'var(--surface-3)', borderRadius: 999, padding: '1px 8px' }}>Shared with you · {f.permission}</span>
                    )}
                  </span>
                  <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>
                    {count} system{count === 1 ? '' : 's'}{f.location ? ` · ${f.location}` : ''}
                  </span>
                </div>
                <span className="crop-card-actions">
                  {f.id !== activeFarmId && <button className="link-btn" onClick={() => setActiveFarmId(f.id)}>Switch to</button>}
                  {!shared && <button className="link-btn" onClick={() => setSharing(f)}>Share</button>}
                  {!shared && <button className="link-btn" onClick={() => setModal({ farm: f })}>Rename</button>}
                  {!shared && <button className="link-btn danger" onClick={() => setConfirmDel(f)}>Delete</button>}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {modal && <FarmModal farm={modal.farm} onClose={() => setModal(null)} onSaved={invalidate} />}
      {sharing && <FarmShareModal farm={sharing} onClose={() => setSharing(null)} />}
      {confirmDel && (
        <Modal title="Delete farm" onClose={() => setConfirmDel(null)}>
          <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
            Delete <b>{confirmDel.name}</b> and <b>all of its data</b>
            {(confirmDel.system_count ?? 0) > 0 ? ` — including its ${confirmDel.system_count} system${confirmDel.system_count === 1 ? '' : 's'}, readings, plantings, harvests and programmes` : ''}? This can't be undone.
          </p>
          <div className="mform-actions">
            <button type="button" className="ghost" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button type="button" className="btn btn-danger" disabled={del.isPending} onClick={() => del.mutate(confirmDel)}>{del.isPending ? 'Deleting…' : 'Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const LEVELS = [
  { value: 'view', label: 'View — read only' },
  { value: 'collaborator', label: 'Collaborator — read & write data' },
  { value: 'admin', label: 'Admin — full data & config' },
]

function FarmShareModal({ farm, onClose }: { farm: Farm; onClose: () => void }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [level, setLevel] = useState('collaborator')
  const [error, setError] = useState<string | null>(null)
  const { data: shares = [], isLoading } = useQuery({ queryKey: ['farm-shares', farm.id], queryFn: () => fetchFarmShares(farm.id) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['farm-shares', farm.id] })

  const invite = useMutation({
    mutationFn: () => inviteToFarm(farm.id, email.trim(), level),
    onSuccess: () => { setEmail(''); invalidate() },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not share the farm.'),
  })
  const changeLevel = useMutation({ mutationFn: ({ id, lvl }: { id: number; lvl: string }) => updateFarmSharePermission(id, lvl), onSuccess: invalidate })
  const remove = useMutation({ mutationFn: (id: number) => removeFarmShare(id), onSuccess: invalidate })

  return (
    <Modal title={`Share ${farm.name}`} onClose={onClose}>
      <p style={{ marginTop: 0, color: 'var(--ink-faint)', fontSize: 13 }}>
        Everyone you add gets access to <b>every system in this farm</b> — including any you add later. They must already have an Afraponix Go account.
      </p>
      <form className="mform" onSubmit={(e) => { e.preventDefault(); setError(null); if (!email.trim()) return setError('Enter an email address.'); invite.mutate() }}>
        {error && <div className="wq-error">{error}</div>}
        <div className="field">
          <label htmlFor="share-email">Invite by email</label>
          <input id="share-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoFocus />
        </div>
        <div className="field">
          <label htmlFor="share-level">Permission</label>
          <select id="share-level" value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div className="mform-actions">
          <button type="submit" className="btn" disabled={invite.isPending}>{invite.isPending ? 'Sharing…' : 'Share farm'}</button>
        </div>
      </form>

      <h3 className="section-title" style={{ fontSize: 14, marginTop: 18 }}>People with access</h3>
      {isLoading ? (
        <div className="empty">Loading…</div>
      ) : shares.length === 0 ? (
        <div className="empty" style={{ padding: 16 }}>Not shared with anyone yet.</div>
      ) : (
        <div className="op-list">
          {shares.map((s) => (
            <div key={s.id} className="op-item">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.first_name || s.username || s.email}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{s.email}</div>
              </div>
              <span className="crop-card-actions">
                <select value={s.permission_level} onChange={(e) => changeLevel.mutate({ id: s.id, lvl: e.target.value })}>
                  {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.value}</option>)}
                </select>
                <button className="link-btn danger" onClick={() => remove.mutate(s.id)}>Remove</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
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
