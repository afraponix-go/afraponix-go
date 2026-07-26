import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { Modal } from '../../components/Modal'
import { ApiError } from '../../lib/apiClient'
import {
  ROLES,
  SUBSCRIPTIONS,
  fetchAdminUsers,
  fetchAdminStats,
  updateUser,
  resetUserPassword,
  deleteUser,
  fetchSmtp,
  saveSmtp,
  sendTestEmail,
  type AdminUser,
  type SmtpConfig,
} from './adminApi'
import '../fish/fish.css'
import '../dashboard/dashboard.css'
import './settings.css'

function userName(u: AdminUser) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return full || u.email
}

export function AdminSettings() {
  const { user } = useAuth()

  // The route is only linked for admins, but guard the content too.
  if (user?.userRole !== 'admin') {
    return <div className="empty">You need administrator access to view this page.</div>
  }

  return (
    <div>
      <AdminStats />
      <UserManagement />
      <SmtpSettings />
    </div>
  )
}

function AdminStats() {
  const { data } = useQuery({ queryKey: ['admin', 'stats'], queryFn: fetchAdminStats })
  const totalUsers = data?.users?.reduce((n, r) => n + r.count, 0) ?? null
  return (
    <div className="set-card">
      <h2 className="set-title">Overview</h2>
      <div className="admin-stats">
        <div><b>{totalUsers ?? '—'}</b><span>Users</span></div>
        <div><b>{data?.totalSystems ?? '—'}</b><span>Systems</span></div>
        <div><b>{data?.recentRegistrations ?? '—'}</b><span>New this week</span></div>
      </div>
    </div>
  )
}

function UserManagement() {
  const qc = useQueryClient()
  const { user: me } = useAuth()
  const { data: users = [], isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchAdminUsers })
  const [resetFor, setResetFor] = useState<AdminUser | null>(null)
  const [deleteFor, setDeleteFor] = useState<AdminUser | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin'] })

  const roleMut = useMutation({
    mutationFn: ({ id, userRole }: { id: number; userRole: string }) => updateUser(id, { userRole }),
    onSuccess: refresh,
  })
  const subMut = useMutation({
    mutationFn: ({ id, subscriptionStatus }: { id: number; subscriptionStatus: string }) => updateUser(id, { subscriptionStatus }),
    onSuccess: refresh,
  })

  return (
    <div className="set-card wide">
      <h2 className="set-title">Users</h2>
      <p className="set-sub">Manage roles, subscriptions and access for every account.</p>

      {isLoading ? (
        <div className="empty" style={{ border: 'none' }}>Loading users…</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Subscription</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-name">{userName(u)}</div>
                    <div className="admin-user-email">{u.email}</div>
                  </td>
                  <td>
                    <select value={u.user_role} disabled={u.id === me?.id} onChange={(e) => roleMut.mutate({ id: u.id, userRole: e.target.value })}>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={u.subscription_status ?? 'basic'} onChange={(e) => subMut.mutate({ id: u.id, subscriptionStatus: e.target.value })}>
                      {SUBSCRIPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="admin-actions">
                    <button className="share-revoke" type="button" onClick={() => setResetFor(u)}>Reset password</button>
                    <button className="share-revoke" type="button" disabled={u.id === me?.id} onClick={() => setDeleteFor(u)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetFor && <ResetPasswordModal user={resetFor} onDone={() => { setResetFor(null); refresh() }} onClose={() => setResetFor(null)} />}
      {deleteFor && <DeleteUserModal user={deleteFor} onDone={() => { setDeleteFor(null); refresh() }} onClose={() => setDeleteFor(null)} />}
    </div>
  )
}

function ResetPasswordModal({ user, onDone, onClose }: { user: AdminUser; onDone: () => void; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mut = useMutation({
    mutationFn: () => resetUserPassword(user.id, pw),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not reset the password.'),
  })
  return (
    <Modal title={`Reset password — ${userName(user)}`} onClose={onClose}>
      <div className="mform">
        {error && <div className="set-error">{error}</div>}
        <p className="set-sub" style={{ marginTop: 0 }}>Set a new password for this user. Share it with them securely.</p>
        <div className="field">
          <label htmlFor="admin-newpw">New password</label>
          <input id="admin-newpw" type="text" autoComplete="off" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="mform-actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn" type="button" disabled={pw.length < 6 || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Setting…' : 'Set password'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DeleteUserModal({ user, onDone, onClose }: { user: AdminUser; onDone: () => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const mut = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: onDone,
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Could not delete the user.'),
  })
  return (
    <Modal title="Delete user" onClose={onClose}>
      <div className="mform">
        {error && <div className="set-error">{error}</div>}
        <p className="set-sub" style={{ marginTop: 0 }}>
          Permanently delete <b>{userName(user)}</b> ({user.email}) and all of their systems and data? This cannot be undone.
        </p>
        <div className="mform-actions">
          <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" type="button" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Deleting…' : 'Delete user'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function SmtpSettings() {
  const { data } = useQuery({ queryKey: ['admin', 'smtp'], queryFn: fetchSmtp })
  const [cfg, setCfg] = useState<SmtpConfig | null>(null)
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (data) setCfg(data)
  }, [data])

  const saveMut = useMutation({
    mutationFn: () => {
      // Only send the password if the admin typed a new one; the backend keeps
      // the stored one when it's omitted.
      const body: SmtpConfig = { ...(cfg as SmtpConfig), auth: { user: cfg!.auth.user, pass: password || '' } }
      return saveSmtp(body)
    },
    onSuccess: () => { setMsg({ ok: true, text: 'SMTP settings saved.' }); setPassword('') },
    onError: (e) => setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not save SMTP settings.' }),
  })
  const testMut = useMutation({
    mutationFn: () => sendTestEmail(),
    onSuccess: () => setMsg({ ok: true, text: 'Test email sent — check your inbox.' }),
    onError: (e) => setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not send the test email.' }),
  })

  if (!cfg) return <div className="set-card"><h2 className="set-title">Email (SMTP)</h2><div className="empty" style={{ border: 'none' }}>Loading…</div></div>

  const set = (patch: Partial<SmtpConfig>) => setCfg({ ...cfg, ...patch })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    saveMut.mutate()
  }

  return (
    <div className="set-card">
      <h2 className="set-title">Email (SMTP)</h2>
      <p className="set-sub">Outgoing mail for verification codes and password resets.</p>
      <form className="mform" onSubmit={onSubmit}>
        {msg && <div className={msg.ok ? 'set-ok' : 'set-error'}>{msg.text}</div>}
        <div className="row-2">
          <div className="field">
            <label htmlFor="smtp-host">Host</label>
            <input id="smtp-host" value={cfg.host} onChange={(e) => set({ host: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="smtp-port">Port</label>
            <input id="smtp-port" type="number" value={cfg.port} onChange={(e) => set({ port: Number(e.target.value) })} />
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="smtp-user">Username</label>
            <input id="smtp-user" value={cfg.auth.user} onChange={(e) => set({ auth: { ...cfg.auth, user: e.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="smtp-pass">Password <span className="unit-hint">(leave blank to keep)</span></label>
            <input id="smtp-pass" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </div>
        <div className="row-2">
          <div className="field">
            <label htmlFor="smtp-from-name">From name</label>
            <input id="smtp-from-name" value={cfg.from.name} onChange={(e) => set({ from: { ...cfg.from, name: e.target.value } })} />
          </div>
          <div className="field">
            <label htmlFor="smtp-from-addr">From email</label>
            <input id="smtp-from-addr" type="email" value={cfg.from.address} onChange={(e) => set({ from: { ...cfg.from, address: e.target.value } })} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="smtp-reseturl">Password-reset URL</label>
          <input id="smtp-reseturl" value={cfg.resetUrl} onChange={(e) => set({ resetUrl: e.target.value })} />
        </div>
        <div className="mform-actions">
          <button className="btn ghost" type="button" disabled={testMut.isPending} onClick={() => { setMsg(null); testMut.mutate() }}>
            {testMut.isPending ? 'Sending…' : 'Send test email'}
          </button>
          <button className="btn" type="submit" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Saving…' : 'Save SMTP settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
