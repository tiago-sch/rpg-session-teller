import { generateRecap } from './_openai.js'
import { ensureInkBalance, requireUser, spendInk } from './_supabase.js'
import { readJsonBody, sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

const RECAP_COST = 1
const MAX_SESSIONS = 20

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Method not allowed')
  }

  try {
    const { user, supabase } = await requireUser(req)
    const body = await readJsonBody(req)
    if (!isGenerateRecapBody(body)) return sendError(res, 400, 'Invalid recap request')

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, notes')
      .eq('id', body.campaignId)
      .eq('user_id', user.id)
      .single()
    if (campaignError || !campaign) return sendError(res, 404, 'Campaign not found')

    const sessionCount = Math.min(Math.max(Math.floor(body.sessionCount), 1), MAX_SESSIONS)
    const [{ data: sessionRows }, { data: chars }] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, title, tldr, generated_text')
        .eq('campaign_id', campaign.id)
        .not('tldr', 'is', null)
        .order('position', { ascending: false })
        .limit(sessionCount),
      supabase.from('campaign_characters').select('name, notes').eq('campaign_id', campaign.id).order('sort_order'),
    ])

    const sessions = ((sessionRows ?? []) as { id: number; title: string; tldr: string; generated_text: string | null }[]).reverse()
    if (sessions.length === 0) return sendError(res, 400, 'This campaign has no chronicles to recap yet.')

    await ensureInkBalance(supabase, user.id, RECAP_COST)

    const recap = await generateRecap(
      campaign.name,
      sessions,
      sessions[sessions.length - 1].generated_text,
      body.toneId,
      { notes: campaign.notes, characters: (chars ?? []) as { name: string; notes?: string | null }[] },
    )
    const newBalance = await spendInk(supabase, RECAP_COST)

    const { data: saved, error: saveError } = await supabase
      .from('campaign_recaps')
      .insert({
        campaign_id: campaign.id,
        user_id: user.id,
        recap,
        tone: body.toneId,
        session_count: sessions.length,
        last_session_id: sessions[sessions.length - 1].id,
      })
      .select('id, recap, tone, session_count, last_session_id, session_id, audio_url, audio_voice, audio_duration, created_at')
      .single()
    if (saveError || !saved) throw saveError ?? new Error('Failed to save recap.')

    return res.status(200).json({ recap: saved, inks: newBalance })
  } catch (error) {
    console.error('Failed to generate recap', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Recap generation failed')
  }
}

function isGenerateRecapBody(value: unknown): value is {
  campaignId: number
  sessionCount: number
  toneId: string | null
} {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.campaignId === 'number'
    && typeof body.sessionCount === 'number'
    && (typeof body.toneId === 'string' || body.toneId === null)
}
