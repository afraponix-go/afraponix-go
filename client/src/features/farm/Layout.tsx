import { useSystems } from '../systems/SystemContext'
import { FarmLayout } from './FarmLayout'
import { FarmLayoutOverview } from './FarmLayoutOverview'

// In farm mode the layout is a compact whole-farm overview (a card per system);
// pick a system to open its full, interactive layout.
export function Layout() {
  const { isFarmMode } = useSystems()
  return isFarmMode ? <FarmLayoutOverview /> : <FarmLayout />
}
