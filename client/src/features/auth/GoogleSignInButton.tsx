import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithGoogle } from './api'
import { useAuth } from './AuthContext'
import { ApiError } from '../../lib/apiClient'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GSI_SRC = 'https://accounts.google.com/gsi/client'

// Load the Google Identity Services script once and resolve when ready.
let gsiPromise: Promise<void> | null = null
function loadGsi(): Promise<void> {
  if (gsiPromise) return gsiPromise
  gsiPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GSI_SRC}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Could not load Google sign-in.'))
    document.head.appendChild(s)
  })
  return gsiPromise
}

// "Sign in with Google" button. Renders nothing when no client id is configured,
// so the app is unchanged until VITE_GOOGLE_CLIENT_ID is set at build time.
export function GoogleSignInButton({ onError }: { onError?: (msg: string) => void }) {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const hostRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!CLIENT_ID) return
    let cancelled = false

    loadGsi()
      .then(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google
        if (cancelled || !google?.accounts?.id || !hostRef.current) return
        google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: async (resp: { credential?: string }) => {
            if (!resp.credential) return
            try {
              const res = await loginWithGoogle(resp.credential)
              if (!res.token) throw new Error('Google sign-in did not return a session.')
              await signIn(res.token, res.user)
              navigate('/', { replace: true })
            } catch (err) {
              onError?.(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.')
            }
          },
        })
        google.accounts.id.renderButton(hostRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
          width: 320,
        })
      })
      .catch(() => { if (!cancelled) setFailed(true) })

    return () => { cancelled = true }
  }, [signIn, navigate, onError])

  if (!CLIENT_ID || failed) return null

  return (
    <div className="google-signin">
      <div className="auth-divider"><span>or</span></div>
      <div ref={hostRef} className="google-signin-host" />
    </div>
  )
}
