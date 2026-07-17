import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider } from './features/auth/AuthContext'
import { SystemProvider } from './features/systems/SystemContext'
import { router } from './app/router'
import './styles/tokens.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SystemProvider>
          <RouterProvider router={router} />
        </SystemProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
