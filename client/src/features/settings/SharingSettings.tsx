import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { canManageSystemSharing } from '../systems/api'
import { ApiError } from '../../lib/apiClient'
import {
  PERMISSIONS,
  fetchShares,
  fetchPendingInvites,
  inviteUser,
  updatePermission,
  revokeAccess,
  type Share,
} from './sharingApi'
import '../fish/fish.css'
import '../dashboard/dashboard.css'
import './settings.css'

function displayName(s: Share) {
  const full = [s.first_name, s.last_name].filter(Boolean).join(' ').trim()
  return full || s.username || s.email
}

export function SharingSettings() {
  const { activeId, activeSystem } = useSystems()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState('view')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const sharesQ = useQuery({
    queryKey: ['shares', activeId],
    queryFn: () => fetchShares(activeId as string),
    enabled: !!activeId,
  })
  const pendingQ = useQuery({
    queryKey: ['shares', 'pending', activeId],
    queryFn: () => fetchPendingInvites(activeId as string),
    enabled: !!activeId,
  })

  function refresh() {
    qc.invalidateQueries({ queryKey: ['shares', activeId] })
    qc.invalidateQueries({ queryKey: ['shares', 'pending', activeId] })
  }

  const inviteMut = useMutation({
    mutationFn: () => inviteUser(activeId as string, email, permission),
    onSuccess: (res) => {
      setNotice(res?.message || `Invitation sent to ${email.trim()}.`)
      setEmail('')
      refresh()
      setTimeout(() => setNotice(null), 3000)
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not send the invitation.'),
  })

  const permMut = useMutation({
    mutationFn: ({ id, level }: { id: number; level: string }) => updatePermission(id, level),
    onSuccess: refresh,
  })

  const revokeMut = useMutation({
    mutationFn: (id: number) => revokeAccess(id),
    onSuccess: refresh,
  })

  function onInvite(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!email.trim()) return setError('Enter an email address.')
    inviteMut.mutate()
  }

  if (!activeId) return <div className="empty">Select a system to manage sharing.</div>
  if (!canManageSystemSharing(activeSystem)) return <div className="empty">Only the owner or an admin can manage sharing for this system.</div>

  const shares = sharesQ.data ?? []
  const pending = pendingQ.data ?? []

  return (
    <div>
      <div className="set-card">
        <h2 className="set-title">Invite people</h2>
        <p className="set-sub">
          Share <b>{activeSystem?.system_name}</b> with someone by email. If they don’t have an Afraponix Go account yet,
          they’ll get an email inviting them to create one — and the system will be waiting when they sign in.
        </p>

        <form className="mform" onSubmit={onInvite}>
          {error && <div className="set-error">{error}</div>}
          {notice && <div className="set-ok">{notice}</div>}
          <div className="share-invite-row">
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="inv-email">Email address</label>
              <input id="inv-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="inv-perm">Permission</label>
              <select id="inv-perm" value={permission} onChange={(e) => setPermission(e.target.value)}>
                {PERMISSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mform-actions">
            <button className="btn" type="submit" disabled={inviteMut.isPending}>
              {inviteMut.isPending ? 'Sending…' : 'Send invitation'}
            </button>
          </div>
        </form>
      </div>

      <div className="set-card">
        <h2 className="set-title">People with access</h2>
        {shares.length === 0 ? (
          <p className="set-sub" style={{ marginBottom: 0 }}>No one else has access to this system yet.</p>
        ) : (
          <ul className="share-list">
            {shares.map((s) => (
              <li key={s.id} className="share-item">
                <div className="share-who">
                  <div className="share-name">{displayName(s)}</div>
                  <div className="share-email">{s.email}</div>
                </div>
                <div className="share-controls">
                  <select
                    value={s.permission_level}
                    onChange={(e) => permMut.mutate({ id: s.id, level: e.target.value })}
                    disabled={permMut.isPending}
                  >
                    {PERMISSIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button className="share-revoke" type="button" onClick={() => revokeMut.mutate(s.id)} disabled={revokeMut.isPending}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pending.length > 0 && (
        <div className="set-card">
          <h2 className="set-title">Pending invitations</h2>
          <ul className="share-list">
            {pending.map((s) => (
              <li key={s.id} className="share-item">
                <div className="share-who">
                  <div className="share-name">{displayName(s)}</div>
                  <div className="share-email">{s.email} · {s.permission_level}</div>
                </div>
                <div className="share-controls">
                  <span className="share-pending">{s.awaiting_signup ? 'Awaiting sign-up' : 'Pending'}</span>
                  <button className="share-revoke" type="button" onClick={() => revokeMut.mutate(s.id)} disabled={revokeMut.isPending}>
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
