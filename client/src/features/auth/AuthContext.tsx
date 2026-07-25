import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getToken, setToken, clearToken } from '../../lib/token'
import { queryClient } from '../../lib/queryClient'
import { fetchCurrentUser, type User } from './api'

// Anything user-scoped that lives outside React Query and must not leak between
// accounts in the same browser tab.
const ACTIVE_SYSTEM_KEY = 'afraponix_active_system'

// Drop every trace of the previous identity: cached query data and the persisted
// active-system selection. Without this, signing into a second account in the
// same tab shows the first account's cached systems and readings.
function resetClientState() {
  queryClient.clear()
  localStorage.removeItem(ACTIVE_SYSTEM_KEY)
}

type AuthState = {
  user: User | null
  status: 'loading' | 'authenticated' | 'anonymous'
  signIn: (token: string, user?: User) => Promise<void>
  signOut: () => void
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthState['status']>('loading')

  // On boot, if we have a token, confirm it's still valid by fetching the user.
  useEffect(() => {
    let active = true
    if (!getToken()) {
      setStatus('anonymous')
      return
    }
    fetchCurrentUser()
      .then((u) => {
        if (!active) return
        setUser(u)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!active) return
        clearToken()
        setStatus('anonymous')
      })
    return () => {
      active = false
    }
  }, [])

  async function signIn(token: string, u?: User) {
    // Start clean so a new identity can't inherit the previous one's cache or
    // active-system selection.
    resetClientState()
    setToken(token)
    const resolved = u ?? (await fetchCurrentUser())
    setUser(resolved)
    setStatus('authenticated')
  }

  function signOut() {
    clearToken()
    resetClientState()
    setUser(null)
    setStatus('anonymous')
  }

  return <AuthCtx.Provider value={{ user, status, signIn, signOut }}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
