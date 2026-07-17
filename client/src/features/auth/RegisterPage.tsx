import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from './api'
import { useAuth } from './AuthContext'
import { ApiError } from '../../lib/apiClient'
import './auth.css'

export function RegisterPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const res = await register(form)
      if (res.token) {
        await signIn(res.token, res.user)
        navigate('/', { replace: true })
      } else {
        // Email-verification flow — no token yet.
        setNotice(res.message ?? 'Account created. Check your email to verify your account, then sign in.')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="sub">Join Afraponix Go — you'll sign in with your email.</p>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-error" style={{ background: 'color-mix(in srgb, var(--ok) 14%, transparent)', color: 'var(--ok)' }}>{notice}</div>}
        <div className="row-2">
          <div className="field">
            <label htmlFor="firstName">First name</label>
            <input id="firstName" autoComplete="given-name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" autoComplete="family-name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
