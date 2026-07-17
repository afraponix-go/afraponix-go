import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { ProtectedRoute } from './ProtectedRoute'
import { AppShell } from './AppShell'
import { DashboardPage, StubPage } from './DashboardPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'fish', element: <StubPage title="Fish" /> },
          { path: 'plants', element: <StubPage title="Plants" /> },
          { path: 'grow-beds', element: <StubPage title="Grow Beds" /> },
          { path: 'water', element: <StubPage title="Water Quality" /> },
        ],
      },
    ],
  },
])
