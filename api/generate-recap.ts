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
        .select('title, tldr, generated_text')
        .eq('campaign_id', campaign.id)
        .not('tldr', 'is', null)
        .order('created_at', { ascending: false })
        .limit(sessionCount),
      supabase.from('campaign_characters').select('name, notes').eq('campaign_id', campaign.id).order('sort_order'),
    ])

    const sessions = ((sessionRows ?? []) as { title: string; tldr: string; generated_text: string | null }[]).reverse()
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
    const generatedAt = new Date().toISOString()

    const { error: saveError } = await supabase
      .from('campaigns')
      .update({ recap, recap_generated_at: generatedAt })
      .eq('id', campaign.id)
    if (saveError) throw saveError

    return res.status(200).json({ recap, generatedAt, inks: newBalance })
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
