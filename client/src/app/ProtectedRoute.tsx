import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function ProtectedRoute() {
  const { status } = useAuth()
  if (status === 'loading') {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-faint)' }}>Loading…</div>
  }
  // Anonymous visitors get the public landing page, which is the front door to
  // sign-in and registration.
  if (status === 'anonymous') return <Navigate to="/welcome" replace />
  return <Outlet />
}
