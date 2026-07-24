import { useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, verifyCode, resendVerification } from './api'
import { useAuth } from './AuthContext'
import { ApiError } from '../../lib/apiClient'
import './auth.css'

// Same rules the old app enforced on the registration form.
const RULES = [
  { key: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { key: 'special', label: 'One special character (!@#$%^&*)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const STRENGTH = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']

export function RegisterPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Verification step
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const boxes = useRef<Array<HTMLInputElement | null>>([])

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const passed = useMemo(() => RULES.filter((r) => r.test(form.password)).length, [form.password])
  const passwordOk = passed === RULES.length
  const confirmTouched = form.confirm.length > 0
  const passwordsMatch = form.password === form.confirm

  async function onRegister(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!passwordOk) return setError('Please meet all the password requirements.')
    if (!passwordsMatch) return setError('Passwords do not match.')

    setBusy(true)
    try {
      const { confirm: _confirm, ...payload } = form
      const res = await register(payload)
      if (res.token && res.user) {
        // SMTP not configured — the backend auto-verifies and returns a token.
        await signIn(res.token, res.user)
        navigate('/', { replace: true })
        return
      }
      setStep('verify')
      setNotice(res.message ?? `We've sent a 6-digit code to ${form.email}.`)
      setTimeout(() => boxes.current[0]?.focus(), 0)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function submitCode(code: string) {
    setError(null)
    setBusy(true)
    try {
      const res = await verifyCode(form.email, code)
      if (res.token && res.user) {
        await signIn(res.token, res.user)
        navigate('/', { replace: true })
      } else {
        setNotice(res.message ?? 'Email verified. You can now sign in.')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That code was not accepted. Please try again.')
      setDigits(['', '', '', '', '', ''])
      boxes.current[0]?.focus()
    } finally {
      setBusy(false)
    }
  }

  // Accepts more than one digit at a time: browsers deliver OTP autofill that
  // way, and fast typing can outrun the focus shift between boxes.
  function onDigit(i: number, value: string) {
    const incoming = value.replace(/\D/g, '')
    if (!incoming) {
      const cleared = [...digits]
      cleared[i] = ''
      setDigits(cleared)
      return
    }
    const next = [...digits]
    for (let n = 0; n < incoming.length && i + n < 6; n++) {
      next[i + n] = incoming[n]
    }
    setDigits(next)
    const landed = Math.min(i + incoming.length, 5)
    boxes.current[landed]?.focus()
    if (next.every((d) => d)) submitCode(next.join(''))
  }

  function onDigitKey(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus()
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = ['', '', '', '', '', ''].map((_, i) => text[i] ?? '')
    setDigits(next)
    if (text.length === 6) submitCode(text)
    else boxes.current[text.length]?.focus()
  }

  async function onResend() {
    setError(null)
    setBusy(true)
    try {
      const res = await resendVerification(form.email)
      setNotice(res.message ?? 'A new code is on its way.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend the code.')
    } finally {
      setBusy(false)
    }
  }

  if (step === 'verify') {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <h1>Verify your email</h1>
          <p className="sub">
            Enter the 6-digit code we sent to <b>{form.email}</b>, or click the link in that email.
          </p>
          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}

          <div className="code-row" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  boxes.current[i] = el
                }}
                className="code-box"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={d}
                disabled={busy}
                aria-label={`Digit ${i + 1}`}
                onChange={(e) => onDigit(i, e.target.value)}
                onKeyDown={(e) => onDigitKey(i, e)}
              />
            ))}
          </div>

          <button className="btn" type="button" disabled={busy || digits.some((d) => !d)} onClick={() => submitCode(digits.join(''))}>
            {busy ? 'Verifying…' : 'Verify code'}
          </button>

          <p className="auth-switch">
            Didn't get it?{' '}
            <button type="button" className="link-btn" onClick={onResend} disabled={busy}>
              Resend code
            </button>
          </p>
          <p className="auth-switch">
            <button type="button" className="link-btn" onClick={() => { setStep('form'); setError(null); setNotice(null) }}>
              ← Back
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={onRegister} noValidate>
        <h1>Create your account</h1>
        <p className="sub">Join Afraponix Go — you'll sign in with your email.</p>
        {error && <div className="auth-error">{error}</div>}
        {notice && <div className="auth-notice">{notice}</div>}

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
          <div className="pw-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {form.password && (
            <>
              <div className="pw-bar">
                <div className={`pw-fill s${passed}`} style={{ width: `${(passed / RULES.length) * 100}%` }} />
              </div>
              <div className="pw-strength">Password strength: <b>{STRENGTH[Math.max(0, passed - 1)]}</b></div>
              <ul className="pw-rules">
                {RULES.map((r) => {
                  const ok = r.test(form.password)
                  return (
                    <li key={r.key} className={ok ? 'ok' : ''}>
                      <span aria-hidden>{ok ? '✓' : '✗'}</span> {r.label}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <div className="pw-wrap">
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              required
            />
          </div>
          {confirmTouched && (
            <div className={`pw-match ${passwordsMatch ? 'ok' : 'bad'}`}>
              <span aria-hidden>{passwordsMatch ? '✓' : '✗'}</span> {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </div>
          )}
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
