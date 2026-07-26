import { useAuth } from '../auth/AuthContext'
import { SubTabLayout, type SubTab } from '../../app/SubTabLayout'

const BASE_TABS: SubTab[] = [
  { to: '/settings', label: 'General', end: true },
  { to: '/settings/account', label: 'Account' },
  { to: '/settings/sharing', label: 'Sharing' },
  { to: '/settings/danger', label: 'Danger Zone' },
]

const ADMIN_TAB: SubTab = { to: '/settings/admin', label: 'Admin' }

// Settings sub-tabs, with the Admin tab shown only to administrators.
export function SettingsLayout() {
  const { user } = useAuth()
  const tabs = user?.userRole === 'admin' ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS
  return <SubTabLayout items={tabs} />
}
