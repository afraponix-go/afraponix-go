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
// Sentinel "active system" that means "the whole farm" — the app's farm mode.
// Farm-aware tabs (Fish, Plants) render every system in the active farm,
// separated by system; other tabs prompt to pick a single system.
export const ALL_SYSTEMS_ID = '__all__'

// 'own' = your farm; 'shared' = a real farm another user shared with you;
// 'bucket' = the synthetic "Shared with me" group for individually-shared systems.
export type FarmOption = { id: string; name: string; kind: 'own' | 'shared' | 'bucket'; systemCount: number; permission?: string | null }

type SystemState = {
  systems: System[]        // systems in the active farm (what the app operates on)
  allSystems: System[]     // every system the user can see, across farms
  activeId: string | null
  activeSystem: System | null
  isFarmMode: boolean       // active "system" is the ALL sentinel (whole farm)
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

  // Farm options for the switcher: the user's own farms and farms shared with
  // them (both real farms, from /farms), plus a synthetic "Shared with me"
  // bucket for any systems shared individually (not through a shared farm).
  const farmIds = useMemo(() => new Set(ownFarms.map((f) => f.id)), [ownFarms])
  const looseShared = useMemo(
    () => allSystems.filter((s) => !isOwnedSystem(s) && !farmIds.has(s.farm_id ?? '')),
    [allSystems, farmIds],
  )
  const farms = useMemo<FarmOption[]>(() => {
    const opts: FarmOption[] = ownFarms.map((f) => ({
      id: f.id,
      name: f.name,
      kind: (f.kind ?? 'own') as 'own' | 'shared',
      systemCount: f.system_count ?? allSystems.filter((s) => s.farm_id === f.id).length,
      permission: f.permission ?? null,
    }))
    if (looseShared.length) opts.push({ id: SHARED_FARM_ID, name: 'Shared with me', kind: 'bucket', systemCount: looseShared.length })
    return opts
  }, [ownFarms, allSystems, looseShared])

  // The systems belonging to the active farm.
  const systemsInFarm = (farmId: string | null) =>
    farmId === SHARED_FARM_ID ? looseShared : allSystems.filter((s) => s.farm_id === farmId)
  const systems = useMemo(() => systemsInFarm(activeFarmId), [allSystems, looseShared, activeFarmId])

  // The default active "system" for a farm: whole-farm mode when it has more
  // than one system (the app opens on the farm overview, then you pick a system
  // from the pills), otherwise the single system.
  const defaultActive = (sys: System[]) => (sys.length > 1 ? ALL_SYSTEMS_ID : sys[0]?.id ?? null)

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
    // Farm mode is a valid selection as long as the active farm has systems.
    if (activeId === ALL_SYSTEMS_ID) {
      if (systems.length === 0) {
        const next = systemsInFarm(activeFarmId)[0]?.id ?? null
        setActiveIdState(next)
        if (next) localStorage.setItem(ACTIVE_KEY, next)
        else localStorage.removeItem(ACTIVE_KEY)
      }
      return
    }
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
    const next = defaultActive(systems)
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
    // Land on the new farm's default view (whole-farm when it has several
    // systems), so the app never shows a system from a different farm.
    const next = defaultActive(systemsInFarm(id))
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
      isFarmMode: activeId === ALL_SYSTEMS_ID,
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

// Pin the active system for a subtree. Farm mode renders one of these per system
// around an otherwise-unchanged tab, so every `useSystems().activeId` inside it
// resolves to that system (and isFarmMode is false, so it won't recurse).
export function SystemScope({ systemId, children }: { systemId: string; children: ReactNode }) {
  const base = useSystems()
  const value = useMemo<SystemState>(() => {
    const sys = base.allSystems.find((s) => s.id === systemId) ?? null
    return { ...base, activeId: systemId, activeSystem: sys, isFarmMode: false }
  }, [base, systemId])
  return <SystemCtx.Provider value={value}>{children}</SystemCtx.Provider>
}
