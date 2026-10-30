import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface EpisodeSession {
  id: number
  public_id: string
  title: string
}

// The sessions of a campaign in order, used for "Session N of M" and previous/next links.
export function useCampaignEpisodes(sessionId: number | null | undefined, campaignId: number | null | undefined) {
  const { data: episodes = [] } = useQuery<EpisodeSession[]>({
    queryKey: ['campaign-episodes', campaignId],
    queryFn: async () => {
      const { data } = await supabase
        .from('sessions')
        .select('id, public_id, title')
        .eq('campaign_id', campaignId!)
        .order('position', { ascending: true })
      return (data as EpisodeSession[]) ?? []
    },
    enabled: !!campaignId,
  })

  const index = episodes.findIndex(e => e.id === sessionId)
  return {
    number: index === -1 ? null : index + 1,
    total: episodes.length,
    previous: index > 0 ? episodes[index - 1] : null,
    next: index !== -1 && index < episodes.length - 1 ? episodes[index + 1] : null,
  }
}
