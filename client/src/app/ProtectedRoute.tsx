import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { TermsGate } from '../features/auth/TermsGate'
import { rememberReturnTo } from '../lib/returnTo'

export function ProtectedRoute() {
  const { status } = useAuth()
  const loc = useLocation()
  if (status === 'loading') {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-faint)' }}>Loading…</div>
  }
  // Anonymous visitors get the public landing page, which is the front door to
  // sign-in and registration.
  // Keep a scanned label / emailed approval link so sign-in can come straight back to it.
  if (status === 'anonymous') {
    rememberReturnTo(loc.pathname + loc.search)
    return <Navigate to="/welcome" replace />
  }
  // Signed-in users must accept the current terms before reaching the app.
  return (
    <TermsGate>
      <Outlet />
    </TermsGate>
  )
}
