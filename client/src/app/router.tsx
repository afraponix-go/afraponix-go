import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { LandingPage } from '../features/landing/LandingPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppShell } from './AppShell'
import { SubTabLayout, Placeholder } from './SubTabLayout'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { ChartsPage } from '../features/charts/ChartsPage'
import { WaterQualityPage } from '../features/water/WaterQualityPage'
import { FishOverview } from '../features/fish/FishOverview'
import { FishDensity } from '../features/fish/FishDensity'
import { TankInformation } from '../features/fish/TankInformation'
import { FishHealth } from '../features/fish/FishHealth'
import { FishDataCapture } from '../features/fish/FishDataCapture'
import { PlantsOverview } from '../features/plants/PlantsOverview'
import { Plantings } from '../features/plants/Plantings'
import { Harvest } from '../features/plants/Harvest'
import { BedsAllocation } from '../features/plants/BedsAllocation'
import { Crops } from '../features/plants/CropsPage'
import { FishStockingCalculator } from '../features/calculator/FishStockingCalculator'
import { OperationsPage } from '../features/operations/OperationsPage'

const DASHBOARD_TABS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/charts', label: 'Charts' },
]
const DATA_TABS = [
  { to: '/data', label: 'Water Quality', end: true },
  { to: '/data/operations', label: 'Operations' },
  { to: '/data/import-export', label: 'Import / Export' },
]
const CALC_TABS = [
  { to: '/calculator', label: 'Fish Stocking', end: true },
  { to: '/calculator/nutrients', label: 'Nutrient Dosing' },
]
const FISH_TABS = [
  { to: '/fish', label: 'Overview', end: true },
  { to: '/fish/density', label: 'Density' },
  { to: '/fish/tanks', label: 'Tank Information' },
  { to: '/fish/health', label: 'Fish Health' },
  { to: '/fish/capture', label: 'Data Capture' },
]
const PLANTS_TABS = [
  { to: '/plants', label: 'Overview', end: true },
  { to: '/plants/plantings', label: 'Plantings' },
  { to: '/plants/harvest', label: 'Harvest' },
  { to: '/plants/beds', label: 'Beds' },
  { to: '/plants/crops', label: 'Crops' },
]

export const router = createBrowserRouter([
  { path: '/welcome', element: <LandingPage /> },
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
              { path: 'operations', element: <OperationsPage /> },
              { path: 'import-export', element: <Placeholder title="Import / Export" note="Bulk import and export of system data." /> },
            ],
          },
          // Fish (Overview · Tank Information · Fish Health · Data Capture)
          {
            path: 'fish',
            element: <SubTabLayout items={FISH_TABS} />,
            children: [
              { index: true, element: <FishOverview /> },
              { path: 'density', element: <FishDensity /> },
              { path: 'tanks', element: <TankInformation /> },
              { path: 'health', element: <FishHealth /> },
              { path: 'capture', element: <FishDataCapture /> },
            ],
          },
          // Plants (Overview · Plantings · Harvest · Beds & Allocation · Crops)
          {
            path: 'plants',
            element: <SubTabLayout items={PLANTS_TABS} />,
            children: [
              { index: true, element: <PlantsOverview /> },
              { path: 'plantings', element: <Plantings /> },
              { path: 'harvest', element: <Harvest /> },
              { path: 'beds', element: <BedsAllocation /> },
              { path: 'crops', element: <Crops /> },
            ],
          },
          // Settings (grow-bed config now lives under Plants → Beds & Allocation)
          { path: 'settings', element: <Placeholder title="System Settings" note="System configuration, sharing, and account settings. Coming next." /> },
        ],
      },
    ],
  },
])
