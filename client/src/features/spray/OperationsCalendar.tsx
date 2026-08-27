import { useSystems } from '../systems/SystemContext'
import { SprayCalendar } from './SprayCalendar'
import { OperationsCalendarFarm } from './OperationsCalendarFarm'

// In farm mode the calendar rolls up every system (pick one to zoom in and
// record); otherwise it's the single-system calendar.
export function OperationsCalendar() {
  const { isFarmMode } = useSystems()
  return isFarmMode ? <OperationsCalendarFarm /> : <SprayCalendar />
}
