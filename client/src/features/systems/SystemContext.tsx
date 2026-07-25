import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchSystems, type System } from './api'

const ACTIVE_KEY = 'afraponix_active_system'

type SystemState = {
  systems: System[]
  activeId: string | null
  activeSystem: System | null
  isLoading: boolean
  setActiveId: (id: string) => void
}

const SystemCtx = createContext<SystemState | null>(null)

export function SystemProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const { data: systems = [], isLoading } = useQuery({
    queryKey: ['systems'],
    queryFn: fetchSystems,
    enabled: status === 'authenticated',
  })
  const [activeId, setActiveIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY))

  // Once systems load, make sure the active selection belongs to this user.
  // Must also handle the empty case: a persisted id from a previous account
  // would otherwise dangle and drive queries for a system the user cannot see.
  useEffect(() => {
    if (isLoading) return
    const stillValid = activeId != null && systems.some((s) => s.id === activeId)
    if (stillValid) return
    const next = systems[0]?.id ?? null
    setActiveIdState(next)
    if (next) localStorage.setItem(ACTIVE_KEY, next)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [systems, isLoading, activeId])

  function setActiveId(id: string) {
    setActiveIdState(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }

  const value = useMemo<SystemState>(
    () => ({
      systems,
      activeId,
      activeSystem: systems.find((s) => s.id === activeId) ?? null,
      isLoading,
      setActiveId,
    }),
    [systems, activeId, isLoading],
  )

  return <SystemCtx.Provider value={value}>{children}</SystemCtx.Provider>
}

export function useSystems() {
  const ctx = useContext(SystemCtx)
  if (!ctx) throw new Error('useSystems must be used within SystemProvider')
  return ctx
}
