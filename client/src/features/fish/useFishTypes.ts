import { useQuery } from '@tanstack/react-query'
import { useSystems } from '../systems/SystemContext'
import { fetchFishInventory } from './api'

// The distinct fish species stocked in a system's tanks (default: the active system). Shares the
// ['fish-inventory', systemId] cache with the dashboard, so it costs no extra
// request there. Used to pick species-specific limits (e.g. trout temperature).
export function useFishTypes(systemId?: string | null): string[] {
  const { activeId } = useSystems()
  const id = systemId ?? activeId
  const { data: tanks = [] } = useQuery({
    queryKey: ['fish-inventory', id],
    queryFn: () => fetchFishInventory(id as string),
    enabled: !!id && id !== '__all__',
  })
  return Array.from(new Set(tanks.map((t) => t.tank_fish_type).filter((t): t is string => !!t)))
}
