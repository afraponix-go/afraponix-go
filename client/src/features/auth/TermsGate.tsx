import { useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { acceptTerms } from './api'
import { ApiError } from '../../lib/apiClient'
import { TERMS_VERSION, TermsContent } from '../legal/terms'

// Blocks the app for a signed-in user until they accept the current terms.
export function TermsGate({ children }: { children: ReactNode }) {
  const { user, setUser, signOut } = useAuth()
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // No user yet, or already accepted the current version → let the app through.
  if (!user || user.termsVersion === TERMS_VERSION) return <>{children}</>

  async function accept() {
    if (!checked || !user) return
    setBusy(true)
    setError(null)
    try {
      await acceptTerms(TERMS_VERSION)
      setUser({ ...user, termsVersion: TERMS_VERSION })
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your acceptance. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="terms-gate" role="dialog" aria-modal="true" aria-labelledby="terms-title">
      <div className="terms-card">
        <div className="terms-card-head">
          <h1 id="terms-title">Terms of Use</h1>
          <p>Please read and accept these terms to continue.</p>
        </div>
        <div className="terms-scroll">
          <TermsContent />
        </div>
        <div className="terms-card-foot">
          {error && <p className="terms-err">{error}</p>}
          <label className="terms-accept">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>I have read and accept the Terms of Use, and understand the app is a guide used at my own risk.</span>
          </label>
          <div className="terms-actions">
            <button className="terms-btn" type="button" disabled={!checked || busy} onClick={accept}>
              {busy ? 'Saving…' : 'Accept & continue'}
            </button>
            <button className="terms-logout" type="button" onClick={signOut}>Log out</button>
          </div>
        </div>
      </div>
    </div>
  )
}
