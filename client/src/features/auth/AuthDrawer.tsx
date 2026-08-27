import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, register, verifyCode, resendVerification } from './api'
import { useAuth } from './AuthContext'
import { ApiError } from '../../lib/apiClient'
import { GoogleSignInButton } from './GoogleSignInButton'
import './auth.css'
import './authDrawer.css'

type Mode = 'signin' | 'register'

const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

// A slide-out sign-in / create-account panel, so auth happens in place instead
// of a full-page navigation. The /login and /register routes still exist for
// deep links and session-expiry redirects.
export function AuthDrawer({ open, initialMode = 'signin', onClose }: { open: boolean; initialMode?: Mode; onClose: () => void }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>(initialMode)
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [code, setCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Reset to the requested mode each time the drawer opens; close on Escape.
  useEffect(() => {
    if (open) { setMode(initialMode); setStep('form'); setError(null); setNotice(null) }
  }, [open, initialMode])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const passed = useMemo(() => RULES.filter((r) => r.test(form.password)).length, [form.password])
  const passwordOk = passed === RULES.length
  const passwordsMatch = form.password === form.confirm

  function done() {
    onClose()
    navigate('/', { replace: true })
  }

  async function onSignIn(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try {
      const res = await login(form.email, form.password)
      if (!res.token) throw new Error('Login did not return a session token.')
      await signIn(res.token, res.user)
      done()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Check your details and try again.')
    } finally { setBusy(false) }
  }

  async function onRegister(e: FormEvent) {
    e.preventDefault(); setError(null); setNotice(null)
    if (!passwordOk) return setError('Please meet all the password requirements.')
    if (!passwordsMatch) return setError('Passwords do not match.')
    setBusy(true)
    try {
      const { confirm: _c, ...payload } = form
      const res = await register(payload)
      if (res.token && res.user) { await signIn(res.token, res.user); return done() }
      setStep('verify')
      setNotice(res.message ?? `We've sent a 6-digit code to ${form.email}.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.')
    } finally { setBusy(false) }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault(); setError(null); setBusy(true)
    try {
      const res = await verifyCode(form.email, code.trim())
      if (res.token && res.user) { await signIn(res.token, res.user); return done() }
      setNotice(res.message ?? 'Email verified. You can now sign in.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code was not accepted. Please try again.')
    } finally { setBusy(false) }
  }

  async function onResend() {
    setError(null); setBusy(true)
    try {
      const res = await resendVerification(form.email)
      setNotice(res.message ?? 'A new code is on its way.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend the code.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <div className={`auth-drawer-backdrop${open ? ' open' : ''}`} onClick={onClose} aria-hidden={!open} />
      <aside className={`auth-drawer${open ? ' open' : ''}`} aria-hidden={!open} aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}>
        <button type="button" className="auth-drawer-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 4l10 10M14 4L4 14" /></svg>
        </button>

        {step === 'verify' ? (
          <form className="auth-drawer-body" onSubmit={onVerify} noValidate>
            <h2>Verify your email</h2>
            <p className="auth-drawer-sub">Enter the 6-digit code we sent to <b>{form.email}</b>.</p>
            {error && <div className="auth-error">{error}</div>}
            {notice && <div className="auth-notice">{notice}</div>}
            <div className="field">
              <label htmlFor="ad-code">Verification code</label>
              <input id="ad-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456" autoFocus />
            </div>
            <button className="btn" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify & continue'}</button>
            <p className="auth-switch">Didn't get it? <button type="button" className="link-btn" onClick={onResend} disabled={busy}>Resend code</button></p>
            <p className="auth-switch"><button type="button" className="link-btn" onClick={() => { setStep('form'); setError(null); setNotice(null) }}>← Back</button></p>
          </form>
        ) : mode === 'signin' ? (
          <form className="auth-drawer-body" onSubmit={onSignIn} noValidate>
            <h2>Sign in</h2>
            <p className="auth-drawer-sub">Welcome back.</p>
            {error && <div className="auth-error">{error}</div>}
            <div className="field">
              <label htmlFor="ad-email">Email address</label>
              <input id="ad-email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="ad-pw">Password</label>
              <input id="ad-pw" type="password" autoComplete="current-password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
            </div>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <GoogleSignInButton onError={setError} />
            <p className="auth-switch"><Link to="/forgot-password" onClick={onClose}>Forgot password?</Link></p>
            <p className="auth-switch">No account? <button type="button" className="link-btn" onClick={() => { setMode('register'); setError(null) }}>Create one</button></p>
          </form>
        ) : (
          <form className="auth-drawer-body" onSubmit={onRegister} noValidate>
            <h2>Create your account</h2>
            <p className="auth-drawer-sub">Join Afraponix Go.</p>
            {error && <div className="auth-error">{error}</div>}
            {notice && <div className="auth-notice">{notice}</div>}
            <div className="row-2">
              <div className="field"><label htmlFor="ad-fn">First name</label><input id="ad-fn" autoComplete="given-name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required autoFocus /></div>
              <div className="field"><label htmlFor="ad-ln">Last name</label><input id="ad-ln" autoComplete="family-name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required /></div>
            </div>
            <div className="field">
              <label htmlFor="ad-remail">Email address</label>
              <input id="ad-remail" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="ad-rpw">Password</label>
              <div className="pw-wrap">
                <input id="ad-rpw" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} required />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((s) => !s)}>{showPw ? 'Hide' : 'Show'}</button>
              </div>
              {form.password && (
                <ul className="pw-rules compact">
                  {RULES.map((r) => { const ok = r.test(form.password); return <li key={r.key} className={ok ? 'ok' : ''}><span aria-hidden>{ok ? '✓' : '○'}</span> {r.label}</li> })}
                </ul>
              )}
            </div>
            <div className="field">
              <label htmlFor="ad-confirm">Confirm password</label>
              <input id="ad-confirm" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} required />
              {form.confirm.length > 0 && <div className={`pw-match ${passwordsMatch ? 'ok' : 'bad'}`}><span aria-hidden>{passwordsMatch ? '✓' : '✗'}</span> {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</div>}
            </div>
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
            <GoogleSignInButton onError={setError} />
            <p className="auth-switch">Already have an account? <button type="button" className="link-btn" onClick={() => { setMode('signin'); setError(null) }}>Sign in</button></p>
          </form>
        )}
      </aside>
    </>
  )
}
