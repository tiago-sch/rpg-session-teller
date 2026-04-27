import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface Profile {
  display_name: string | null
  is_admin: boolean
  inks: number
}

export function useProfile() {
  const { user } = useAuth()

  const { data: profile = null, isLoading: loading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, is_admin, inks')
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

  // Atomically deduct inks via RPC. Returns an error string if insufficient or RPC fails.
  // On success, immediately patches the cached profile so the navbar updates without a refetch.
  const spendInks = async (amount: number): Promise<string | undefined> => {
    const { data: newBalance, error } = await supabase.rpc('spend_inks', { amount })
    if (error) {
      if (error.message.includes('not_enough_inks')) return 'Not enough ink.'
      return error.message
    }
    queryClient.setQueryData(['profile', user?.id], (old: Profile | null) =>
      old ? { ...old, inks: newBalance as number } : old
    )
    return undefined
  }

  return { profile, loading, update, spendInks }
}
