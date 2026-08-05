import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyEmailToken } from './api'
import { useAuth } from './AuthContext'
import { ApiError } from '../../lib/apiClient'
import { Brand } from '../../components/Brand'
import './auth.css'

// Landing page for the verification email's link (/verify-email?token=…).
// It consumes the token via the API, then signs the user straight in.
export function VerifyEmailPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<'working' | 'error'>('working')
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    // Guard against React 18 StrictMode's double-invoke consuming the token twice.
    if (ran.current) return
    ran.current = true

    if (!token) {
      setStatus('error')
      setError('This link is missing its verification token. Try the button in your email again, or sign in to resend.')
      return
    }
    verifyEmailToken(token)
      .then(async (res) => {
        if (res.token && res.user) {
          await signIn(res.token, res.user)
          navigate('/', { replace: true })
        } else {
          // Verified but no session returned — send them to sign in.
          navigate('/login', { replace: true })
        }
      })
      .catch((err) => {
        setStatus('error')
        setError(
          err instanceof ApiError
            ? err.message
            : 'We could not verify this link. It may have expired or already been used.',
        )
      })
  }, [token, signIn, navigate])

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <Link to="/welcome" className="auth-brand" aria-label="Afraponix Go home">
          <Brand size={34} />
        </Link>
        <h1>Verifying your email</h1>
        {status === 'working' ? (
          <p className="sub">One moment while we confirm your account…</p>
        ) : (
          <>
            <div className="auth-error">{error}</div>
            <p className="auth-switch">
              <Link to="/login">Go to sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
