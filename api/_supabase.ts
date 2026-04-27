import { createClient } from '@supabase/supabase-js'
import { requiredEnv, requiredEnvAny } from './_env.js'
import type { ApiRequest } from './_http.js'

export function getBearerToken(req: ApiRequest) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

export function supabaseForToken(token: string) {
  return createClient(
    requiredEnvAny('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    requiredEnvAny('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export function supabaseAdmin() {
  return createClient(
    requiredEnvAny('SUPABASE_URL', 'VITE_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  )
}

export async function requireUser(req: ApiRequest) {
  const token = getBearerToken(req)
  if (!token) throw new Error('Missing authorization token')

  const supabase = supabaseForToken(token)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Invalid authorization token')

  return { token, user, supabase }
}

export async function ensureInkBalance(supabase: ReturnType<typeof supabaseForToken>, userId: string, amount: number) {
  const { data, error } = await supabase
    .from('profiles')
    .select('inks')
    .eq('id', userId)
    .single()

  if (error) throw error
  if (!data || Number(data.inks) < amount) throw new Error('Not enough ink.')
}

export async function spendInk(supabase: ReturnType<typeof supabaseForToken>, amount: number) {
  const { data, error } = await supabase.rpc('spend_inks', { amount })
  if (error) {
    if (error.message.includes('not_enough_inks')) throw new Error('Not enough ink.')
    throw error
  }
  return data as number
}

export async function getCampaignGenerationContext(
  supabase: ReturnType<typeof supabaseForToken>,
  campaignId: number | null,
) {
  if (!campaignId) return {}

  const [{ data: campaignData }, { data: historyData }, { data: chars }] = await Promise.all([
    supabase.from('campaigns').select('notes, include_history').eq('id', campaignId).single(),
    supabase.from('sessions').select('tldr').eq('campaign_id', campaignId).not('tldr', 'is', null).order('created_at', { ascending: true }),
    supabase.from('campaign_characters').select('name, notes').eq('campaign_id', campaignId).order('sort_order'),
  ])

  const campaignHistory = campaignData?.include_history && historyData
    ? (historyData as { tldr: string }[]).map(s => s.tldr).filter(Boolean)
    : undefined

  const characters = ((chars ?? []) as { name: string; notes?: string | null }[]).filter(c => c.name)
  const campaignContext = campaignData?.notes || characters.length > 0
    ? { notes: campaignData?.notes, characters }
    : undefined

  return { campaignHistory, campaignContext }
}
