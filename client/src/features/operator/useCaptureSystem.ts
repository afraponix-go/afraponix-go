import { useEffect } from 'react'
import { useSystems, ALL_SYSTEMS_ID } from '../systems/SystemContext'

// A concrete system to capture into for the simple operator forms (feeding,
// water, planting) — never the "all systems" farm-wide sentinel, which a
// single-system form can't do anything with. Snaps to the first real system
// when the app is in whole-farm mode (e.g. because the operator's farm has
// more than one system and nothing was picked yet).
export function useCaptureSystem() {
  const { systems, activeId, activeSystem, setActiveId } = useSystems()
  const systemId = activeId && activeId !== ALL_SYSTEMS_ID ? activeId : (systems[0]?.id ?? null)

  useEffect(() => {
    if (systemId && systemId !== activeId) setActiveId(systemId)
  }, [systemId, activeId, setActiveId])

  return { systems, systemId, system: systemId === activeId ? activeSystem : null, setActiveId }
}
