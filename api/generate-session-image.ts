import { generateImage } from './_gemini.js'
import { ensureInkBalance, requireUser, spendInk, supabaseAdmin } from './_supabase.js'
import { readJsonBody, sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

interface SessionRow {
  id: number
  title: string
  prompt: string | null
  tone: string | null
  campaign_id: number | null
  campaigns: { name: string; notes: string | null } | null
}

const TONE_LABELS: Record<string, string> = {
  dark_fantasy: 'Dark Fantasy',
  epic_high_fantasy: 'Epic High Fantasy',
  comedic_chaotic: 'Comedic / Chaotic',
  bard: 'Narrated by a Bard',
  journal: "PC's Journal",
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Method not allowed')
  }

  try {
    const { user, supabase } = await requireUser(req)
    const body = await readJsonBody(req)
    if (!isGenerateImageBody(body)) return sendError(res, 400, 'Invalid image request')

    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, title, prompt, tone, campaign_id, campaigns(name, notes)')
      .eq('public_id', body.publicId)
      .single()

    if (sessionError || !session) return sendError(res, 404, 'Session not found')

    await ensureInkBalance(supabase, user.id, 3)

    const typedSession = session as unknown as SessionRow
    const { data: chars } = typedSession.campaign_id
      ? await supabase
        .from('campaign_characters')
        .select('name, notes')
        .eq('campaign_id', typedSession.campaign_id)
        .order('sort_order')
      : { data: [] }

    const imagePrompt = buildImagePrompt(typedSession, (chars ?? []) as { name: string; notes?: string | null }[], body)
    const { base64, mimeType } = await generateImage(imagePrompt)
    const newBalance = await spendInk(supabase, 3)

    const ext = mimeType.includes('jpeg') ? 'jpg' : 'png'
    const path = `${user.id}/${Date.now()}.${ext}`
    const bytes = Uint8Array.from(Buffer.from(base64, 'base64'))
    const admin = supabaseAdmin()

    const { error: uploadError } = await admin.storage
      .from('session-images')
      .upload(path, bytes, { contentType: mimeType, upsert: true })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = admin.storage.from('session-images').getPublicUrl(path)

    const { error: saveError } = await supabase
      .from('sessions')
      .update({ cover_image_url: publicUrl, image_prompt: body.extraNotes.trim() || null })
      .eq('public_id', body.publicId)
    if (saveError) throw saveError

    return res.status(200).json({ publicUrl, inks: newBalance })
  } catch (error) {
    console.error('Failed to generate session image', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Image generation failed')
  }
}

function buildImagePrompt(
  session: SessionRow,
  chars: { name: string; notes?: string | null }[],
  options: GenerateImageBody,
) {
  const toneName = session.tone ? TONE_LABELS[session.tone] : undefined
  const parts: string[] = []
  if (options.includeCampaignName && session.campaigns?.name) parts.push(`Campaign: ${session.campaigns.name}`)
  if (options.includeTitle && session.title) parts.push(`Session: ${session.title}`)
  if (session.prompt) parts.push(`Session notes: ${session.prompt}`)
  if (options.includeCampaignNotes && session.campaigns?.notes) parts.push(`World context: ${session.campaigns.notes}`)
  if (options.includeCharacters && chars.length > 0) {
    const charLines = chars
      .filter(c => c.name.trim())
      .map(c => c.notes?.trim() ? `- ${c.name}: ${c.notes}` : `- ${c.name}`)
    if (charLines.length > 0) parts.push(`Key characters:\n${charLines.join('\n')}`)
  }
  if (options.includeTone && toneName) parts.push(`Tone: ${toneName}`)
  if (options.extraNotes.trim()) parts.push(`Additional context: ${options.extraNotes.trim()}`)
  if (!options.includeTone || !toneName) parts.push('Style: fantasy illustration, realistic painterly style, not cartoony')
  parts.push('Create a single evocative fantasy scene illustration based on this session. No text, no borders.')
  return parts.join('\n')
}

interface GenerateImageBody {
  publicId: string
  extraNotes: string
  includeCampaignName: boolean
  includeTitle: boolean
  includeCampaignNotes: boolean
  includeCharacters: boolean
  includeTone: boolean
}

function isGenerateImageBody(value: unknown): value is GenerateImageBody {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.publicId === 'string'
    && typeof body.extraNotes === 'string'
    && typeof body.includeCampaignName === 'boolean'
    && typeof body.includeTitle === 'boolean'
    && typeof body.includeCampaignNotes === 'boolean'
    && typeof body.includeCharacters === 'boolean'
    && typeof body.includeTone === 'boolean'
}
