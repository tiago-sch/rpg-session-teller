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
    if (!isRegenerateSessionBody(body)) return sendError(res, 400, 'Invalid regeneration request')

    const prompt = body.prompt.trim()
    if (!prompt) return sendError(res, 400, 'Prompt is required')

    const { data: existing, error: existingError } = await supabase
      .from('sessions')
      .select('id')
      .eq('public_id', body.publicId)
      .single()

    if (existingError || !existing) return sendError(res, 404, 'Session not found')

    await ensureInkBalance(supabase, user.id, 1)

    const { campaignHistory, campaignContext } = await getCampaignGenerationContext(supabase, body.campaignId)
    const generated = await generateSession(prompt, body.fillGaps, body.toneId, campaignHistory, campaignContext)
    const newBalance = await spendInk(supabase, 1)

    return res.status(200).json({
      tldr: generated.tldr,
      story: generated.story,
      inks: newBalance,
    })
  } catch (error) {
    console.error('Failed to regenerate session', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Generation failed')
  }
}

function isRegenerateSessionBody(value: unknown): value is {
  publicId: string
  campaignId: number | null
  prompt: string
  fillGaps: boolean
  toneId: string | null
} {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.publicId === 'string'
    && (typeof body.campaignId === 'number' || body.campaignId === null)
    && typeof body.prompt === 'string'
    && typeof body.fillGaps === 'boolean'
    && (typeof body.toneId === 'string' || body.toneId === null)
}
