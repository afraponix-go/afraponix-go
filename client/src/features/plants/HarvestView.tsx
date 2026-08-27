import { useSystems } from '../systems/SystemContext'
import { Harvest } from './Harvest'
import { HarvestFarm } from './HarvestFarm'

// In farm mode, roll Ready-to-harvest and History up across every system;
// otherwise show the single-system Harvest tab.
export function HarvestView() {
  const { isFarmMode } = useSystems()
  return isFarmMode ? <HarvestFarm /> : <Harvest />
}
