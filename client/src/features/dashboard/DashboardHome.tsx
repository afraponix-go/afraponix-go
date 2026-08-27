import { useSystems } from '../systems/SystemContext'
import { FarmDashboardPage } from './FarmDashboardPage'
import { DashboardPage } from './DashboardPage'
import { FirstRunWelcome } from '../onboarding/FirstRunWelcome'

// One Overview tab for both scopes: a first-run welcome when the account has no
// systems yet, the whole-farm summary in farm mode, else the system overview.
export function DashboardHome() {
  const { isFarmMode, systems, isLoading } = useSystems()
  if (!isLoading && systems.length === 0) return <FirstRunWelcome />
  return isFarmMode ? <FarmDashboardPage /> : <DashboardPage />
}
