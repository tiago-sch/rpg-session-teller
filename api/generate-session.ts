import { generateSession } from './_gemini.js'
import { ensureInkBalance, getCampaignGenerationContext, requireUser, spendInk } from './_supabase.js'
import { readJsonBody, sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Method not allowed')
  }

  try {
    const { user, supabase } = await requireUser(req)
    const body = await readJsonBody(req)
    if (!isGenerateSessionBody(body)) return sendError(res, 400, 'Invalid generation request')

    const title = body.title.trim()
    const prompt = body.prompt.trim()
    if (!title || !prompt) return sendError(res, 400, 'Title and prompt are required')

    await ensureInkBalance(supabase, user.id, 1)

    const { campaignHistory, campaignContext } = await getCampaignGenerationContext(supabase, body.campaignId)
    const generated = await generateSession(prompt, body.fillGaps, body.toneId, campaignHistory, campaignContext)
    const newBalance = await spendInk(supabase, 1)

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        title,
        campaign_id: body.campaignId,
        prompt,
        tone: body.toneId,
        tldr: generated.tldr,
        generated_text: generated.story,
      })
      .select('public_id')
      .single()

    if (error || !data) throw error ?? new Error('Failed to save session.')

    return res.status(200).json({
      publicId: (data as { public_id: string }).public_id,
      inks: newBalance,
    })
  } catch (error) {
    console.error('Failed to generate session', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Generation failed')
  }
}

function isGenerateSessionBody(value: unknown): value is {
  title: string
  campaignId: number | null
  prompt: string
  fillGaps: boolean
  toneId: string | null
} {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.title === 'string'
    && (typeof body.campaignId === 'number' || body.campaignId === null)
    && typeof body.prompt === 'string'
    && typeof body.fillGaps === 'boolean'
    && (typeof body.toneId === 'string' || body.toneId === null)
}
