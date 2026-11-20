import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ApiError } from '../../lib/apiClient'
import { fetchAccessRequest, decideAccessRequest, type AccessLevel } from './api'
import { SystemPicker } from './SystemPicker'
import '../plants/scan.css'
import './access.css'

const LEVELS: { value: AccessLevel; label: string; hint: string }[] = [
  { value: 'operator', label: 'Operator', hint: 'Scan labels and log readings, feeding, plantings and harvests' },
  { value: 'view', label: 'View only', hint: 'See everything, change nothing' },
  { value: 'collaborator', label: 'Collaborator', hint: 'Edit data and settings' },
  { value: 'admin', label: 'Admin', hint: 'Full control, including sharing' },
]

// Where the emailed "Review & approve" button lands. The link itself grants
// nothing: the signed-in user must be the farm's owner or an admin, and approving
// is an explicit click here.
export function AccessRequestPage() {
  const { token = '' } = useParams()
  const { data, isLoading, isError } = useQuery({ queryKey: ['access-request', token], queryFn: () => fetchAccessRequest(token), retry: false })
  const [level, setLevel] = useState<AccessLevel>('operator')
  // null = every system. When they scanned a specific system, start with just that
  // one ticked (least access) — the approver can widen it.
  const [picked, setPicked] = useState<string[] | null | undefined>(undefined)
  const initial = data ? (data.system && data.systems.some((s) => s.id === data.system!.id) ? [data.system.id] : data.can_share_all ? null : data.systems.map((s) => s.id)) : null
  const selection = picked === undefined ? initial : picked
  const decide = useMutation({ mutationFn: (action: 'approve' | 'decline') => decideAccessRequest(token, { action, permission_level: level, system_ids: selection }) })

  const shell = (children: React.ReactNode) => <div className="scan-wrap"><div className="scan-card ar-card">{children}</div></div>
  if (isLoading) return shell(<div className="empty">Loading request…</div>)
  if (isError || !data) {
    return shell(
      <>
        <h2 style={{ marginTop: 0 }}>Request not found</h2>
        <p style={{ color: 'var(--ink-soft)' }}>This link isn’t valid for the account you’re signed in with. Access requests can only be reviewed by the farm’s owner or an admin — try signing in with that account.</p>
        <div className="scan-actions"><Link className="scan-btn ghost" to="/">Go to dashboard</Link></div>
      </>,
    )
  }

  const done = decide.data?.status ?? (data.status !== 'pending' ? data.status : null)
  const target = data.system?.name ? `${data.system.name} (${data.farm.name})` : data.farm.name
  const err = decide.error instanceof ApiError ? decide.error.message : decide.error ? 'Something went wrong. Please try again.' : null

  return shell(
    <>
      <div className="scan-head">
        <div className="scan-batch">Access request</div>
        <div className="ar-who">{data.requester.name}</div>
        {data.requester.email && <div className="ar-email">{data.requester.email}</div>}
      </div>
      <p style={{ margin: '0 0 6px', color: 'var(--ink-soft)', fontSize: 15 }}>
        scanned a label for <b>{target}</b> and is asking for access.
      </p>
      {data.message && <div className="ar-quote">“{data.message}”</div>}

      {done ? (
        <div className={done === 'approved' ? 'ar-sent' : 'ar-err'}>
          {done === 'approved'
            ? `Approved${data.granted_level ? ` — ${data.granted_level} access` : decide.data ? '' : ''}. They’ve been emailed.`
            : 'Declined. They’ve been told their request wasn’t approved.'}
        </div>
      ) : (
        <>
          <div className="ar-field">
            <label htmlFor="ar-level">Access level</label>
            <select id="ar-level" value={level} onChange={(e) => setLevel(e.target.value as AccessLevel)}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <div className="ar-hint">{LEVELS.find((l) => l.value === level)?.hint}</div>
          </div>
          <div className="ar-field">
            <label>Systems they can use</label>
            <SystemPicker systems={data.systems} canShareAll={data.can_share_all} value={selection} onChange={setPicked} />
            <div className="ar-hint">The farm is shared; this limits which of its systems they can open.</div>
          </div>
          {err && <div className="ar-err">{err}</div>}
          <div className="scan-actions">
            <button type="button" className="scan-btn primary" disabled={decide.isPending || (selection !== null && selection.length === 0)} onClick={() => decide.mutate('approve')}>Approve</button>
            <button type="button" className="scan-btn" disabled={decide.isPending} onClick={() => decide.mutate('decline')}>Decline</button>
          </div>
        </>
      )}
    </>,
  )
}
