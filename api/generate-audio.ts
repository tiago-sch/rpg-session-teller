import { detectLanguage, narrationInstructions, NARRATION_VOICES, synthesizeSpeech } from './_openai.js'
import type { NarrationVoice } from './_openai.js'
import { mp3Duration } from './_mp3.js'
import { ensureInkBalance, requireUser, spendInk, supabaseAdmin } from './_supabase.js'
import { readJsonBody, sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

// Keep in sync with src/lib/narration.ts.
const CHARS_PER_INK = 4000
const MAX_CHARS = 60000
const BUCKET = 'narrations'

interface NarrationTarget {
  table: 'sessions' | 'campaign_recaps'
  id: number
  text: string
  toneId: string | null
  language: string | null
  audioUrl: string | null
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Method not allowed')
  }

  try {
    const { user, supabase } = await requireUser(req)
    const body = await readJsonBody(req)
    if (!isGenerateAudioBody(body)) return sendError(res, 400, 'Invalid narration request')

    const target = await loadTarget(supabase, user.id, body.kind, body.id)
    if (!target) return sendError(res, 404, 'Nothing to narrate')
    if (target.text.length > MAX_CHARS) return sendError(res, 400, 'This text is too long to narrate.')

    const cost = Math.max(1, Math.ceil(target.text.length / CHARS_PER_INK))
    await ensureInkBalance(supabase, user.id, cost)

    const language = target.language ?? await detectLanguage(target.text)
    const audio = await synthesizeSpeech(target.text, body.voice, narrationInstructions(language, target.toneId))
    const duration = mp3Duration(audio)
    const newBalance = await spendInk(supabase, cost)

    const admin = supabaseAdmin()
    const path = `${user.id}/${body.kind}-${target.id}-${Date.now()}.mp3`
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, new Uint8Array(audio), { contentType: 'audio/mpeg', upsert: true })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

    const { error: saveError } = await supabase
      .from(target.table)
      .update({ audio_url: publicUrl, audio_voice: body.voice, audio_duration: duration, language })
      .eq('id', target.id)
    if (saveError) throw saveError

    const oldPath = target.audioUrl && storagePath(target.audioUrl)
    if (oldPath) await admin.storage.from(BUCKET).remove([oldPath])

    return res.status(200).json({ audioUrl: publicUrl, voice: body.voice, duration, inks: newBalance })
  } catch (error) {
    console.error('Failed to generate narration', error)
    return sendError(res, 500, error instanceof Error ? error.message : 'Narration failed')
  }
}

async function loadTarget(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  userId: string,
  kind: 'session' | 'recap',
  id: number,
): Promise<NarrationTarget | null> {
  if (kind === 'session') {
    const { data } = await supabase
      .from('sessions')
      .select('id, title, generated_text, tone, language, audio_url')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (!data?.generated_text?.trim()) return null
    return {
      table: 'sessions',
      id: data.id,
      text: `${data.title}\n\n${data.generated_text.trim()}`,
      toneId: data.tone,
      language: data.language,
      audioUrl: data.audio_url,
    }
  }

  const { data } = await supabase
    .from('campaign_recaps')
    .select('id, recap, tone, language, audio_url')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (!data?.recap?.trim()) return null
  return {
    table: 'campaign_recaps',
    id: data.id,
    text: data.recap.trim(),
    toneId: data.tone,
    language: data.language,
    audioUrl: data.audio_url,
  }
}

function storagePath(publicUrl: string) {
  const marker = `/object/public/${BUCKET}/`
  const index = publicUrl.indexOf(marker)
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length))
}

function isGenerateAudioBody(value: unknown): value is { kind: 'session' | 'recap'; id: number; voice: NarrationVoice } {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return (body.kind === 'session' || body.kind === 'recap')
    && typeof body.id === 'number'
    && typeof body.voice === 'string'
    && (NARRATION_VOICES as readonly string[]).includes(body.voice)
}
