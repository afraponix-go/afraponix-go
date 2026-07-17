import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './apiClient'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Don't retry auth/permission failures — they won't fix themselves.
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})
