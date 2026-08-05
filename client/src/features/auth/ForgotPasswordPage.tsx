import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from './api'
import { ApiError } from '../../lib/apiClient'
import { Brand } from '../../components/Brand'
import './auth.css'

// Ask for the account email and trigger a reset link. The backend never reveals
// whether the address exists, so we always show the same confirmation.
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await forgotPassword(email.trim())
      setMessage(res.message ?? `If an account exists for ${email.trim()}, we've sent a password reset link.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the reset link. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      {message ? (
        <div className="auth-card">
          <Link to="/welcome" className="auth-brand" aria-label="Afraponix Go home">
            <Brand size={34} />
          </Link>
          <h1>Check your email</h1>
          <p className="sub">{message}</p>
          <p className="auth-switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      ) : (
        <form className="auth-card" onSubmit={onSubmit} noValidate>
          <Link to="/welcome" className="auth-brand" aria-label="Afraponix Go home">
            <Brand size={34} />
          </Link>
          <h1>Reset your password</h1>
          <p className="sub">Enter your email and we'll send you a reset link.</p>
          {error && <div className="auth-error">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <p className="auth-switch">
            Remembered it? <Link to="/login">Sign in</Link>
          </p>
        </form>
      )}
    </div>
  )
}
