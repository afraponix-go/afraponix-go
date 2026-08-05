import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from './api'
import { ApiError } from '../../lib/apiClient'
import { Brand } from '../../components/Brand'
import './auth.css'

// Landing page for the reset email's link (/reset-password?token=…): set a new
// password, then send the user to sign in.
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) return setError('This reset link is missing its token. Request a new one from "Forgot password".')
    if (password.length < 6) return setError('Password must be at least 6 characters.')
    if (password !== confirm) return setError('The two passwords do not match.')
    setBusy(true)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not reset your password. The link may have expired — request a new one.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <Link to="/welcome" className="auth-brand" aria-label="Afraponix Go home">
            <Brand size={34} />
          </Link>
          <h1>Password updated</h1>
          <p className="sub">You can now sign in with your new password. Redirecting…</p>
          <p className="auth-switch">
            <Link to="/login">Go to sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <Link to="/welcome" className="auth-brand" aria-label="Afraponix Go home">
          <Brand size={34} />
        </Link>
        <h1>Set a new password</h1>
        <p className="sub">Choose a new password for your account.</p>
        {error && <div className="auth-error">{error}</div>}
        <div className="field">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Reset password'}
        </button>
        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  )
}
