import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getToken, setToken, clearToken } from '../../lib/token'
import { fetchCurrentUser, type User } from './api'

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
    setToken(token)
    const resolved = u ?? (await fetchCurrentUser())
    setUser(resolved)
    setStatus('authenticated')
  }

  function signOut() {
    clearToken()
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
