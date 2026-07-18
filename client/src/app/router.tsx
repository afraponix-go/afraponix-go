import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppShell } from './AppShell'
import { SubTabLayout, Placeholder } from './SubTabLayout'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ChartsPage } from '../features/charts/ChartsPage'
import { WaterQualityPage } from '../features/water/WaterQualityPage'
import { FishPage } from '../features/fish/FishPage'
import { PlantsPage } from '../features/plants/PlantsPage'
import { GrowBedsPage } from '../features/growbeds/GrowBedsPage'
import { FishStockingCalculator } from '../features/calculator/FishStockingCalculator'

const DASHBOARD_TABS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/charts', label: 'Charts' },
]
const DATA_TABS = [
  { to: '/data', label: 'Water Quality', end: true },
  { to: '/data/operations', label: 'Operations' },
  { to: '/data/import-export', label: 'Import / Export' },
]
const SETTINGS_TABS = [
  { to: '/settings', label: 'Grow Beds', end: true },
  { to: '/settings/system', label: 'System' },
]
const CALC_TABS = [
  { to: '/calculator', label: 'Fish Stocking', end: true },
  { to: '/calculator/nutrients', label: 'Nutrient Dosing' },
]

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          // Dashboard (Overview · Charts)
          {
            path: '/',
            element: <SubTabLayout items={DASHBOARD_TABS} />,
            children: [
              { index: true, element: <DashboardPage /> },
              { path: 'charts', element: <ChartsPage /> },
            ],
          },
          // Calculator (Fish Stocking · Nutrient Dosing)
          {
            path: 'calculator',
            element: <SubTabLayout items={CALC_TABS} />,
            children: [
              { index: true, element: <FishStockingCalculator /> },
              { path: 'nutrients', element: <Placeholder title="Nutrient Dosing" note="Crop-target-based dosing calculator (reservoir volume, target EC, current levels). Coming next." /> },
            ],
          },
          // Data Capture (Water Quality · Operations · Import/Export)
          {
            path: 'data',
            element: <SubTabLayout items={DATA_TABS} />,
            children: [
              { index: true, element: <WaterQualityPage /> },
              { path: 'operations', element: <Placeholder title="Operations" note="Log feeding, maintenance, and other operations here." /> },
              { path: 'import-export', element: <Placeholder title="Import / Export" note="Bulk import and export of system data." /> },
            ],
          },
          // Fish
          { path: 'fish', element: <FishPage /> },
          // Plants
          { path: 'plants', element: <PlantsPage /> },
          // Settings (Grow Beds · System)
          {
            path: 'settings',
            element: <SubTabLayout items={SETTINGS_TABS} />,
            children: [
              { index: true, element: <GrowBedsPage /> },
              { path: 'system', element: <Placeholder title="System Settings" note="System configuration, sharing, and account settings." /> },
            ],
          },
        ],
      },
    ],
  },
])
