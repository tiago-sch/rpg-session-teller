import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface Profile {
  display_name: string | null
}

export function useProfile() {
  const { user } = useAuth()

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user!.id)
        .single()
      return (data as Profile | null) ?? null
    },
    enabled: !!user,
  })

  const mutation = useMutation({
    mutationFn: async (display_name: string) => {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user!.id, display_name })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })

  const update = async (display_name: string): Promise<Error | undefined> => {
    try {
      await mutation.mutateAsync(display_name)
      return undefined
    } catch (err) {
      return err instanceof Error ? err : new Error('Update failed')
    }
  }

  return { profile, loading, update }
}
