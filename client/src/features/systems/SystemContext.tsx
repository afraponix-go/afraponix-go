import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { fetchSystems, isOwnedSystem, type System } from './api'
import { fetchFarms } from './farmApi'

const ACTIVE_KEY = 'afraponix_active_system'
const ACTIVE_FARM_KEY = 'afraponix_active_farm'
// Synthetic farm holding systems shared with the user (they live in another
// owner's real farm, so they can't sit under one of the user's own farms).
export const SHARED_FARM_ID = '__shared__'

export type FarmOption = { id: string; name: string; kind: 'own' | 'shared'; systemCount: number }

type SystemState = {
  systems: System[]        // systems in the active farm (what the app operates on)
  allSystems: System[]     // every system the user can see, across farms
  activeId: string | null
  activeSystem: System | null
  farms: FarmOption[]
  activeFarmId: string | null
  activeFarm: FarmOption | null
  isLoading: boolean
  setActiveId: (id: string) => void
  setActiveFarmId: (id: string) => void
}

const SystemCtx = createContext<SystemState | null>(null)

export function SystemProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const authed = status === 'authenticated'
  const { data: allSystems = [], isLoading: sysLoading } = useQuery({ queryKey: ['systems'], queryFn: fetchSystems, enabled: authed })
  const { data: ownFarms = [], isLoading: farmLoading } = useQuery({ queryKey: ['farms'], queryFn: fetchFarms, enabled: authed })
  const isLoading = sysLoading || farmLoading

  const [activeId, setActiveIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY))
  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(() => localStorage.getItem(ACTIVE_FARM_KEY))

  // Farm options for the switcher: the user's own farms, plus a "Shared with me"
  // group when any shared systems exist.
  const sharedSystems = useMemo(() => allSystems.filter((s) => !isOwnedSystem(s)), [allSystems])
  const farms = useMemo<FarmOption[]>(() => {
    const opts: FarmOption[] = ownFarms.map((f) => ({
      id: f.id,
      name: f.name,
      kind: 'own',
      systemCount: f.system_count ?? allSystems.filter((s) => s.farm_id === f.id).length,
    }))
    if (sharedSystems.length) opts.push({ id: SHARED_FARM_ID, name: 'Shared with me', kind: 'shared', systemCount: sharedSystems.length })
    return opts
  }, [ownFarms, allSystems, sharedSystems])

  // The systems belonging to the active farm.
  const systemsInFarm = (farmId: string | null) =>
    farmId === SHARED_FARM_ID ? sharedSystems : allSystems.filter((s) => s.farm_id === farmId)
  const systems = useMemo(() => systemsInFarm(activeFarmId), [allSystems, sharedSystems, activeFarmId])

  // Keep the active farm valid (persisted one, else the first option). Wait for
  // real data: before auth resolves the queries are disabled and report empty
  // (not "loading"), which would otherwise reset a valid persisted selection.
  useEffect(() => {
    if (!authed || isLoading) return
    if (activeFarmId != null && farms.some((f) => f.id === activeFarmId)) return
    const next = farms[0]?.id ?? null
    setActiveFarmIdState(next)
    if (next) localStorage.setItem(ACTIVE_FARM_KEY, next)
    else localStorage.removeItem(ACTIVE_FARM_KEY)
  }, [farms, isLoading, activeFarmId, authed])

  // Keep the active system valid. If the active system belongs to a different
  // farm than the active one (e.g. a freshly created system, or a deep link),
  // pull the farm to match rather than dropping the selection.
  useEffect(() => {
    if (!authed || isLoading) return
    if (activeId != null && systems.some((s) => s.id === activeId)) return
    if (activeId != null) {
      const sys = allSystems.find((s) => s.id === activeId)
      if (sys) {
        const desired = isOwnedSystem(sys) ? (sys.farm_id ?? null) : SHARED_FARM_ID
        if (desired && desired !== activeFarmId && farms.some((f) => f.id === desired)) {
          setActiveFarmIdState(desired)
          localStorage.setItem(ACTIVE_FARM_KEY, desired)
          return
        }
      }
    }
    const next = systems[0]?.id ?? null
    setActiveIdState(next)
    if (next) localStorage.setItem(ACTIVE_KEY, next)
    else localStorage.removeItem(ACTIVE_KEY)
  }, [systems, allSystems, farms, isLoading, activeId, activeFarmId, authed])

  function setActiveId(id: string) {
    setActiveIdState(id)
    localStorage.setItem(ACTIVE_KEY, id)
  }
  function setActiveFarmId(id: string) {
    setActiveFarmIdState(id)
    localStorage.setItem(ACTIVE_FARM_KEY, id)
    // Jump to the first system of the newly selected farm so the app never shows
    // a system from a different farm.
    const next = systemsInFarm(id)[0]?.id ?? null
    setActiveIdState(next)
    if (next) localStorage.setItem(ACTIVE_KEY, next)
    else localStorage.removeItem(ACTIVE_KEY)
  }

  const value = useMemo<SystemState>(
    () => ({
      systems,
      allSystems,
      activeId,
      activeSystem: systems.find((s) => s.id === activeId) ?? null,
      farms,
      activeFarmId,
      activeFarm: farms.find((f) => f.id === activeFarmId) ?? null,
      isLoading,
      setActiveId,
      setActiveFarmId,
    }),
    [systems, allSystems, activeId, farms, activeFarmId, isLoading],
  )

  return <SystemCtx.Provider value={value}>{children}</SystemCtx.Provider>
}

export function useSystems() {
  const ctx = useContext(SystemCtx)
  if (!ctx) throw new Error('useSystems must be used within SystemProvider')
  return ctx
}
