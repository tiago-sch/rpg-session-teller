import { useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export interface DraftData {
  title: string
  campaign_id: number | null
  prompt: string
  fill_gaps: boolean
  tone: string | null
  updated_at: string
}

// sessionId: null = new-session draft, number = session edit draft, undefined = not ready
export function useDraft(user: User | null, sessionId: number | null | undefined) {
  const enabled = !!user && sessionId !== undefined
  const queryKey = ['draft', user?.id, sessionId ?? null] as const

  const { data: draft, isLoading } = useQuery<DraftData | null>({
    queryKey,
    queryFn: async () => {
      const query = supabase
        .from('drafts')
        .select('title, campaign_id, prompt, fill_gaps, tone, updated_at')
        .eq('user_id', user!.id)

      const { data } = sessionId !== null
        ? await query.eq('session_id', sessionId).maybeSingle()
        : await query.is('session_id', null).maybeSingle()

      return (data as DraftData | null) ?? null
    },
    enabled,
    staleTime: Infinity,
  })

  const saveMutation = useMutation({
    mutationFn: async (input: Omit<DraftData, 'updated_at'>) => {
      const row = {
        user_id: user!.id,
        session_id: sessionId ?? null,
        ...input,
      }
      const { error } = await supabase
        .from('drafts')
        .upsert(row, { onConflict: 'user_id,session_id' })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const clearMutation = useMutation({
    mutationFn: async () => {
      const query = supabase
        .from('drafts')
        .delete()
        .eq('user_id', user!.id)

      const { error } = sessionId !== null
        ? await query.eq('session_id', sessionId)
        : await query.is('session_id', null)

      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const saveDraft = useCallback(
    (input: Omit<DraftData, 'updated_at'>) => saveMutation.mutate(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, user?.id],
  )

  const clearDraft = useCallback(
    () => clearMutation.mutate(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId, user?.id],
  )

  return { draft, isLoading, saveDraft, clearDraft }
}

export function formatDraftAge(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 10) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}
