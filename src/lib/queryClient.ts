import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // data is fresh for 5 minutes
      gcTime: 1000 * 60 * 10,    // unused cache kept for 10 minutes
      retry: 1,
    },
  },
})
