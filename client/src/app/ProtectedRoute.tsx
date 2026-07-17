import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export function ProtectedRoute() {
  const { status } = useAuth()
  if (status === 'loading') {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ink-faint)' }}>Loading…</div>
  }
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return <Outlet />
}
