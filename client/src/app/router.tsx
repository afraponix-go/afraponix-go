import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage'
import { TermsPage } from '../features/legal/TermsPage'
import { LandingPage } from '../features/landing/LandingPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppShell } from './AppShell'
import { SubTabLayout } from './SubTabLayout'
import { FarmScoped, SystemOnly } from '../features/systems/FarmScoped'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { FarmDashboardPage } from '../features/dashboard/FarmDashboardPage'
import { ChartsPage } from '../features/charts/ChartsPage'
import { FarmLayout } from '../features/farm/FarmLayout'
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
import { Seedlings } from '../features/seedlings/Seedlings'
import { FishStockingCalculator } from '../features/calculator/FishStockingCalculator'
import { NutrientDosingCalculator } from '../features/calculator/NutrientDosingCalculator'
import { OperationsPage } from '../features/operations/OperationsPage'
import { Programmes } from '../features/spray/Programmes'
import { SprayCalendar } from '../features/spray/SprayCalendar'
import { SprayLog } from '../features/spray/SprayLog'
import { SprayCatalog } from '../features/spray/SprayCatalog'
import { ImportExportPage } from '../features/importexport/ImportExportPage'
import { SettingsLayout } from '../features/settings/SettingsLayout'
import { GeneralSettings } from '../features/settings/GeneralSettings'
import { MetricsSettings } from '../features/settings/MetricsSettings'
import { AccountSettings } from '../features/settings/AccountSettings'
import { FarmsSettings } from '../features/settings/FarmsSettings'
import { OperatorsSettings } from '../features/settings/OperatorsSettings'
import { SharingSettings } from '../features/settings/SharingSettings'
import { AdminSettings } from '../features/settings/AdminSettings'
import { DangerZone } from '../features/settings/DangerZone'

const DASHBOARD_TABS = [
  { to: '/', label: 'Farm', end: true },
  { to: '/overview', label: 'Overview' },
  { to: '/charts', label: 'Charts' },
  { to: '/layout', label: 'Layout' },
]
const DATA_TABS = [
  { to: '/data', label: 'Water Quality', end: true },
  { to: '/data/fish', label: 'Fish' },
  { to: '/data/operations', label: 'Maintenance' },
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
]
const PLANTS_TABS = [
  { to: '/plants', label: 'Overview', end: true },
  { to: '/plants/seedlings', label: 'Seedlings' },
  { to: '/plants/plantings', label: 'Plantings' },
  { to: '/plants/harvest', label: 'Harvest' },
  { to: '/plants/beds', label: 'Beds' },
  { to: '/plants/crops', label: 'Crops' },
]
const OPERATIONS_TABS = [
  { to: '/operations', label: 'Calendar', end: true },
  { to: '/operations/programmes', label: 'Programmes' },
  { to: '/operations/log', label: 'Log' },
  { to: '/operations/catalog', label: 'Catalogue' },
]

export const router = createBrowserRouter([
  { path: '/welcome', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/verify-email', element: <VerifyEmailPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/terms', element: <TermsPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          // Dashboard (Overview · Charts)
          {
            path: '/',
            element: <SubTabLayout items={DASHBOARD_TABS} farmAware />,
            children: [
              { index: true, element: <FarmDashboardPage /> },
              { path: 'overview', element: <SystemOnly><DashboardPage /></SystemOnly> },
              { path: 'charts', element: <SystemOnly><ChartsPage /></SystemOnly> },
              { path: 'layout', element: <SystemOnly><FarmLayout /></SystemOnly> },
            ],
          },
          // Calculator (Fish Stocking · Nutrient Dosing)
          {
            path: 'calculator',
            element: <SubTabLayout items={CALC_TABS} />,
            children: [
              { index: true, element: <FishStockingCalculator /> },
              { path: 'nutrients', element: <NutrientDosingCalculator /> },
            ],
          },
          // Data Capture (Water Quality · Fish · Operations · Import/Export)
          {
            path: 'data',
            element: <SubTabLayout items={DATA_TABS} />,
            children: [
              { index: true, element: <WaterQualityPage /> },
              { path: 'fish', element: <FishDataCapture /> },
              { path: 'operations', element: <OperationsPage /> },
              { path: 'import-export', element: <ImportExportPage /> },
            ],
          },
          // Fish (Overview · Density · Tank Information · Fish Health)
          {
            path: 'fish',
            element: <SubTabLayout items={FISH_TABS} farmAware />,
            children: [
              { index: true, element: <FarmScoped kind="fish"><FishOverview /></FarmScoped> },
              { path: 'density', element: <FarmScoped kind="fish"><FishDensity /></FarmScoped> },
              { path: 'tanks', element: <FarmScoped kind="fish"><TankInformation /></FarmScoped> },
              { path: 'health', element: <FarmScoped kind="fish"><FishHealth /></FarmScoped> },
            ],
          },
          // Plants (Overview · Plantings · Harvest · Beds & Allocation · Crops)
          {
            path: 'plants',
            element: <SubTabLayout items={PLANTS_TABS} farmAware />,
            children: [
              { index: true, element: <FarmScoped kind="plants"><PlantsOverview /></FarmScoped> },
              { path: 'seedlings', element: <FarmScoped kind="plants"><Seedlings /></FarmScoped> },
              { path: 'plantings', element: <FarmScoped kind="plants"><Plantings /></FarmScoped> },
              { path: 'harvest', element: <FarmScoped kind="plants"><Harvest /></FarmScoped> },
              { path: 'beds', element: <SystemOnly><BedsAllocation /></SystemOnly> },
              { path: 'crops', element: <SystemOnly><Crops /></SystemOnly> },
            ],
          },
          // Operations (Programmes · Calendar · Log · Catalogue). Spray is the
          // first programme type; dosing + operating follow in later phases.
          {
            path: 'operations',
            element: <SubTabLayout items={OPERATIONS_TABS} />,
            children: [
              { index: true, element: <SprayCalendar /> },
              { path: 'programmes', element: <Programmes /> },
              { path: 'calendar', element: <Navigate to="/operations" replace /> },
              { path: 'log', element: <SprayLog /> },
              { path: 'catalog', element: <SprayCatalog /> },
            ],
          },
          // Keep old /spray links working (bookmarks, back button).
          { path: 'spray', element: <Navigate to="/operations/programmes" replace /> },
          { path: 'spray/calendar', element: <Navigate to="/operations" replace /> },
          { path: 'spray/log', element: <Navigate to="/operations/log" replace /> },
          { path: 'spray/catalog', element: <Navigate to="/operations/catalog" replace /> },
          // Settings (grow-bed config lives under Plants → Beds & Allocation)
          {
            path: 'settings',
            element: <SettingsLayout />,
            children: [
              { index: true, element: <GeneralSettings /> },
              { path: 'metrics', element: <MetricsSettings /> },
              { path: 'account', element: <AccountSettings /> },
              { path: 'farms', element: <FarmsSettings /> },
              { path: 'operators', element: <OperatorsSettings /> },
              { path: 'sharing', element: <SharingSettings /> },
              { path: 'admin', element: <AdminSettings /> },
              { path: 'danger', element: <DangerZone /> },
            ],
          },
        ],
      },
    ],
  },
])
