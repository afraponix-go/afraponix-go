import { useAuth } from '../auth/AuthContext'
import { useSystems } from '../systems/SystemContext'
import { isOwnedSystem } from '../systems/api'
import { SubTabLayout, type SubTab } from '../../app/SubTabLayout'

const GENERAL: SubTab = { to: '/settings', label: 'General', end: true }
const METRICS: SubTab = { to: '/settings/metrics', label: 'Metrics' }
const ACCOUNT: SubTab = { to: '/settings/account', label: 'Account' }
const SHARING: SubTab = { to: '/settings/sharing', label: 'Sharing' }
const DANGER: SubTab = { to: '/settings/danger', label: 'Danger Zone' }
const ADMIN: SubTab = { to: '/settings/admin', label: 'Admin' }

// Settings sub-tabs. Account is always available. General/Sharing/Danger act on
// the active system, so their owner-only operations are hidden when the active
// system is one that was shared with you. Admin is shown only to admins.
export function SettingsLayout() {
  const { user } = useAuth()
  const { activeSystem } = useSystems()
  const owner = isOwnedSystem(activeSystem)

  const tabs: SubTab[] = [GENERAL, METRICS, ACCOUNT]
  if (owner) tabs.push(SHARING, DANGER)
  if (user?.userRole === 'admin') tabs.push(ADMIN)

  return <SubTabLayout items={tabs} />
}
