import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useSystems } from '../systems/SystemContext'
import type { System } from '../systems/api'

// Which system the system-scoped settings pages act on. Independent of the
// global switcher, so Settings works in farm mode — you pick any system in the
// active farm and edit it directly, without changing the app-wide active system.
type Ctx = { systemId: string | null; setSystemId: (id: string) => void; system: System | null; systems: System[] }
const SettingsSystemCtx = createContext<Ctx | null>(null)

export function SettingsSystemProvider({ children }: { children: ReactNode }) {
  const { activeId, systems } = useSystems()
  const [systemId, setSystemId] = useState<string | null>(() =>
    systems.some((s) => s.id === activeId) ? activeId : systems[0]?.id ?? null,
  )
  // Keep the pick valid as the farm's systems change; default to the global
  // active system when it belongs to this farm, else the first system.
  useEffect(() => {
    setSystemId((cur) => {
      if (cur && systems.some((s) => s.id === cur)) return cur
      if (activeId && systems.some((s) => s.id === activeId)) return activeId
      return systems[0]?.id ?? null
    })
  }, [systems, activeId])

  const system = systems.find((s) => s.id === systemId) ?? null
  return <SettingsSystemCtx.Provider value={{ systemId, setSystemId, system, systems }}>{children}</SettingsSystemCtx.Provider>
}

export function useSettingsSystem() {
  const c = useContext(SettingsSystemCtx)
  if (!c) throw new Error('useSettingsSystem must be used within SettingsSystemProvider')
  return c
}
