import { useAuth } from '../auth/AuthContext'
import { useSystems } from '../systems/SystemContext'
import { isOwnedSystem } from '../systems/api'
import { SubTabLayout, type SubTab } from '../../app/SubTabLayout'

const GENERAL: SubTab = { to: '/settings', label: 'General', end: true }
const METRICS: SubTab = { to: '/settings/metrics', label: 'Metrics' }
const ACCOUNT: SubTab = { to: '/settings/account', label: 'Account' }
const FARMS: SubTab = { to: '/settings/farms', label: 'Farms' }
const OPERATORS: SubTab = { to: '/settings/operators', label: 'Operators' }
const DANGER: SubTab = { to: '/settings/danger', label: 'Danger Zone' }
const ADMIN: SubTab = { to: '/settings/admin', label: 'Admin' }

// Settings sub-tabs. Account/Farms/Operators are per-user (usable in farm mode);
// General/Metrics/Danger act on the active system (guarded to a single system).
// Sharing is now managed per farm under Farms. Admin is shown only to admins.
export function SettingsLayout() {
  const { user } = useAuth()
  const { activeSystem } = useSystems()
  const owner = isOwnedSystem(activeSystem)

  const tabs: SubTab[] = [GENERAL, METRICS, ACCOUNT, FARMS, OPERATORS]
  if (owner) tabs.push(DANGER)
  if (user?.userRole === 'admin') tabs.push(ADMIN)

  return <SubTabLayout items={tabs} farmAware />
}
