import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '../../lib/apiClient'
import { requestAccess } from './api'
import '../plants/scan.css'
import './access.css'

// Shown when a scanned Afraponix label points at a farm/system that isn't in the
// signed-in account — instead of leaving the scan page "loading" forever. Offers
// to ask the farm's owner/admins for access (they get an email with a review link).
export function ScanNotInAccount({ what, farmId, systemId }: { what: 'batch' | 'tank'; farmId?: string; systemId?: string }) {
  const [message, setMessage] = useState('')
  const ask = useMutation({
    mutationFn: () => requestAccess({ farm_id: farmId, system_id: systemId, message: message.trim() || undefined }),
  })
  const err = ask.error instanceof ApiError ? (ask.error.status === 404 ? 'That label’s farm no longer exists, so there’s nobody to ask.' : ask.error.message) : ask.error ? 'Something went wrong. Please try again.' : null
  const res = ask.data

  return (
    <div className="scan-card ar-notice">
      <div className="ar-notice-ico" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
      </div>
      <h2>This {what} label is for a different farm</h2>
      <p>
        It doesn’t match anything in your account, so it can’t be opened here. If you work on this farm, you can ask its admins for access — they’ll get an email and can approve you in one tap.
      </p>

      {res?.already_has_access ? (
        <div className="ar-sent">You already have access to this farm. Go back and scan the label again.</div>
      ) : res ? (
        <div className="ar-sent">
          {res.already_requested
            ? 'You’ve already asked for access. The farm’s admins have been emailed — you’ll get an email when they respond.'
            : 'Request sent. The farm’s admins have been emailed — you’ll get an email when they respond.'}
        </div>
      ) : (
        <>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} placeholder="Optional message — e.g. who you are and what you do on the farm" aria-label="Message to the farm admins" />
          {err && <div className="ar-err">{err}</div>}
          <div className="scan-actions">
            <button type="button" className="scan-btn primary" disabled={ask.isPending} onClick={() => ask.mutate()}>{ask.isPending ? 'Sending…' : 'Request access'}</button>
          </div>
        </>
      )}
      <div className="scan-actions" style={{ marginTop: 10 }}>
        <Link className="scan-btn ghost" to="/scan">Scan another</Link>
      </div>
    </div>
  )
}
