import { useSystems } from '../systems/SystemContext'
import { FarmDashboardPage } from './FarmDashboardPage'
import { DashboardPage } from './DashboardPage'

// One Overview tab for both scopes: the whole-farm summary when "All systems"
// is selected, otherwise the active system's overview.
export function DashboardHome() {
  const { isFarmMode } = useSystems()
  return isFarmMode ? <FarmDashboardPage /> : <DashboardPage />
}
