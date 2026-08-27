import { useSystems } from '../systems/SystemContext'
import { ChartsPage } from './ChartsPage'
import { ChartsFarm } from './ChartsFarm'

// In farm mode, charts roll up as a sparkline per system (pick one to zoom in);
// otherwise it's the full single-system charts page.
export function Charts() {
  const { isFarmMode } = useSystems()
  return isFarmMode ? <ChartsFarm /> : <ChartsPage />
}
