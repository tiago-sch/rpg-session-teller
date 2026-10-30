import OpenAI from 'openai'
import { requiredEnv } from './_env.js'
import { joinMp3 } from './_mp3.js'

export interface GeneratedSession {
  tldr: string
  story: string
}

interface Tone {
  id: string
  instruction: string
}

const TONES: Tone[] = [
  {
    id: 'dark_fantasy',
    instruction: `Tone & Style — Dark Fantasy (The Witcher):
Write in a gritty, morally ambiguous register. The world is harsh and beautiful in equal measure. Heroes bear scars — physical and emotional — and victories are often pyrrhic. Use visceral, evocative imagery: blood on stone, shadows that breathe, the weight of exhaustion. Avoid triumphalism. Let dread and melancholy underpin even moments of courage. Prose should feel like it was written by someone who has seen too much.`,
  },
  {
    id: 'epic_high_fantasy',
    instruction: `Tone & Style — Epic High Fantasy (The Lord of the Rings):
Write with grandeur and gravitas. Every action carries the weight of legend, every choice echoes across ages. Use elevated, stately prose — long sentences that breathe with purpose, rich descriptions of landscape, lineage, and ancient things. The chronicle should feel like history being set down by a careful hand. Heroes may falter, but their deeds matter. The light exists because the darkness is real.`,
  },
  {
    id: 'comedic_chaotic',
    instruction: `Tone & Style — Comedic / Chaotic Party:
Write with wit and warmth. The party is gloriously chaotic — their decisions are questionable, their tactics improvised, their victories accidental. Lean into absurdity. Use dry humour, comic timing, and affectionate exaggeration. Failures should be as memorable as successes, perhaps more so. The tone is that of a very funny story being told at the tavern by someone who was there and is still slightly incredulous that it worked out.`,
  },
  {
    id: 'bard',
    instruction: `Tone & Style — Narrated by a Bard:
Write as though performed aloud to a tavern crowd by a skilled bard. Address the audience occasionally ("But what did our heroes do next?", "And here, dear listeners, is where it gets interesting"). Use rhythmic, almost lyrical prose that swells and quiets. Dramatic pauses live in the punctuation. Embellish freely for effect — colour, spectacle, a touch of romance — but never contradict the facts. End moments with a flourish.`,
  },
  {
    id: 'journal',
    instruction: `Tone & Style — In-Character Journal (written by a PC):
Write as an intimate first-person journal entry penned by one of the adventurers present. Voice should be personal, subjective, and unpolished — this is private reflection, not a formal record. Include doubts, small observations, emotional reactions to events. Some facts may be coloured by the character's perspective or missed entirely. The style should feel like a real person sitting alone with a candle and writing while it's all still fresh.`,
  },
]

const SYSTEM_INSTRUCTION_FAITHFUL = `You are a faithful session chronicler for tabletop RPGs.
Your job is to transform raw session notes into polished prose.

Strict rules you must always follow:
- NEVER invent new characters, locations, events, or lore not present in the notes.
- Preserve ALL proper names, quotes, and terminology exactly as they appear — do not paraphrase them.
- Detect the language of the notes and write the entire output in that same language.
- Be immersive and narrative, but stay 100% faithful to what happened.

Return ONLY a valid JSON object with this exact shape:
{
  "tldr": "<2–4 sentence summary of the session>",
  "story": "<full narrative retelling, richly written, in the same language as the notes>"
}`

const SYSTEM_INSTRUCTION_FILL_GAPS = `You are a creative session chronicler for tabletop RPGs.
Your job is to transform raw session notes into an immersive, vivid narrative.

You are allowed — and encouraged — to:
- Add plausible dialogue that fits the characters and situation.
- Describe environments, lighting, sounds, and atmosphere in detail.
- Bridge gaps between scenes with short connective passages.
- Expand on emotional beats and character reactions implied by the notes.

Hard limits that never change:
- Do NOT invent new plot-significant events, major characters, locations, or lore not implied by the notes.
- Preserve ALL proper names, quotes, and terminology exactly as they appear.
- Detect the language of the notes and write the entire output in that same language.
- The invented details must serve the story — they must feel like they could have happened, not change what did happen.

Return ONLY a valid JSON object with this exact shape:
{
  "tldr": "<2–4 sentence summary of the session>",
  "story": "<full narrative retelling, richly written and expanded, in the same language as the notes>"
}`

export interface CampaignContext {
  notes?: string | null
  characters?: { name: string; notes?: string | null }[]
}

const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || 'gpt-5.4-mini'
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2'

function openaiClient() {
  return new OpenAI({ apiKey: requiredEnv('OPENAI_API_KEY') })
}

export async function generateImage(prompt: string): Promise<{ base64: string; mimeType: string }> {
  const response = await openaiClient().images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    size: '1536x1024',
    output_format: 'png',
  })

  const base64 = response.data?.[0]?.b64_json
  if (base64) return { base64, mimeType: 'image/png' }

  throw new Error('No image data returned from OpenAI.')
}

export async function generateSession(
  prompt: string,
  fillGaps = false,
  toneId?: string | null,
  campaignHistory?: string[],
  campaignContext?: CampaignContext,
): Promise<GeneratedSession> {
  const baseInstruction = fillGaps ? SYSTEM_INSTRUCTION_FILL_GAPS : SYSTEM_INSTRUCTION_FAITHFUL

  const contextParts: string[] = []
  if (campaignContext?.notes?.trim()) {
    contextParts.push(`World & Lore Notes:\n${campaignContext.notes.trim()}`)
  }
  if (campaignContext?.characters && campaignContext.characters.length > 0) {
    const charLines = campaignContext.characters
      .filter(c => c.name.trim())
      .map(c => c.notes?.trim() ? `- ${c.name.trim()}: ${c.notes.trim()}` : `- ${c.name.trim()}`)
    if (charLines.length > 0) {
      contextParts.push(`Key Characters:\n${charLines.join('\n')}`)
    }
  }
  const contextBlock = contextParts.length > 0
    ? `\n\nCampaign Context:\n${contextParts.join('\n\n')}`
    : ''

  const historyBlock = campaignHistory && campaignHistory.length > 0
    ? `\n\nCampaign History — previous sessions in chronological order:\n${campaignHistory.map((s, i) => `Session ${i + 1}: ${s}`).join('\n')}\n\nUse this history to understand the ongoing campaign context and maintain continuity. Reference it only to ground the current session — do not retell these past events as if they just happened.`
    : ''

  const tone = TONES.find(t => t.id === toneId)
  const systemInstruction = `${baseInstruction}${contextBlock}${historyBlock}${tone ? `\n\n${tone.instruction}` : ''}`

  const response = await openaiClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
  })

  const text = response.choices[0]?.message?.content ?? ''
  const parsed = JSON.parse(text) as GeneratedSession

  if (!parsed.tldr || !parsed.story) {
    throw new Error('OpenAI returned an unexpected response shape.')
  }

  return parsed
}

const RECAP_INSTRUCTION = `You are the narrator of an ongoing tabletop RPG campaign.
Write a "Previously on…" recap that the game master will read aloud at the start of the next session.

Rules:
- Use ONLY the events in the provided session summaries and latest chronicle. Never invent events, characters, places, or lore.
- Preserve ALL proper names and terminology exactly as written.
- Detect the language of the sessions and write the recap in that same language, including the opening line (e.g. "Previously on…", "Anteriormente em…").
- Keep it between 120 and 250 words: about one to two minutes read aloud.
- Move through events in chronological order, giving the most weight to the latest session.
- End on the open threads and the moment where the party left off, building anticipation for tonight's session.
- Write for the ear: short, vivid sentences, no bullet points, no headings.

Return ONLY a valid JSON object with this exact shape:
{
  "recap": "<the recap text>"
}`

export interface RecapSession {
  title: string
  tldr: string
}

export async function generateRecap(
  campaignName: string,
  sessions: RecapSession[],
  latestStory: string | null,
  toneId?: string | null,
  campaignContext?: CampaignContext,
): Promise<string> {
  const parts = [`Campaign: ${campaignName}`]
  if (campaignContext?.notes?.trim()) parts.push(`World & Lore Notes:\n${campaignContext.notes.trim()}`)
  const characters = campaignContext?.characters?.filter(c => c.name.trim()) ?? []
  if (characters.length > 0) {
    parts.push(`Key Characters:\n${characters.map(c => c.notes?.trim() ? `- ${c.name.trim()}: ${c.notes.trim()}` : `- ${c.name.trim()}`).join('\n')}`)
  }
  parts.push(`Sessions in chronological order:\n${sessions.map((s, i) => `Session ${i + 1} — ${s.title}: ${s.tldr}`).join('\n')}`)
  if (latestStory?.trim()) parts.push(`Full chronicle of the latest session:\n${latestStory.trim().slice(0, 12000)}`)

  const tone = TONES.find(t => t.id === toneId)
  const response = await openaiClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: `${RECAP_INSTRUCTION}${tone ? `\n\n${tone.instruction}` : ''}` },
      { role: 'user', content: parts.join('\n\n') },
    ],
    response_format: { type: 'json_object' },
  })

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? '') as { recap?: string }
  if (!parsed.recap?.trim()) throw new Error('OpenAI returned an unexpected response shape.')
  return parsed.recap.trim()
}

const SPEECH_MODEL = process.env.OPENAI_SPEECH_MODEL || 'gpt-4o-mini-tts'
// The speech model reads at most ~2000 tokens per request; this keeps chunks well under that.
const SPEECH_CHUNK_CHARS = 3000
const SPEECH_CONCURRENCY = 4

export const NARRATION_VOICES = ['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'fable', 'marin', 'nova', 'onyx', 'sage', 'shimmer', 'verse'] as const
export type NarrationVoice = typeof NARRATION_VOICES[number]

const TONE_DELIVERY: Record<string, string> = {
  dark_fantasy: 'Low, grave and weary, like a survivor recounting grim events. Let silences linger.',
  epic_high_fantasy: 'Stately and resonant, like reading an ancient saga aloud. Measured pace, sense of grandeur.',
  comedic_chaotic: 'Warm and wry, with good comic timing, like a friend telling a ridiculous story at the tavern.',
  bard: 'Theatrical and rhythmic, like a bard performing for a tavern crowd, with dramatic pauses and flourishes.',
  journal: 'Intimate and quiet, first person, like someone reading their own private journal by candlelight.',
}

// Returns the language the text is written in, in English, e.g. "Brazilian Portuguese".
export async function detectLanguage(text: string): Promise<string> {
  const response = await openaiClient().chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      { role: 'system', content: 'Identify the language of the user text, including the regional variant when the spelling or vocabulary shows it. Return ONLY a JSON object: {"language": "<language and regional variant in English, e.g. Brazilian Portuguese, European Spanish, American English>"}' },
      { role: 'user', content: text.slice(0, 1500) },
    ],
    response_format: { type: 'json_object' },
  })
  const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{}') as { language?: string }
  return parsed.language?.trim() || 'English'
}

export function narrationInstructions(language: string, toneId?: string | null) {
  const delivery = (toneId && TONE_DELIVERY[toneId]) || 'Calm, warm and immersive, like a narrator reading a fantasy chronicle aloud.'
  return `Speak in ${language} with a natural, native accent for that language and region. Read proper names exactly as written. ${delivery}`
}

export async function synthesizeSpeech(text: string, voice: NarrationVoice, instructions: string): Promise<Buffer> {
  const chunks = splitForSpeech(text)
  const audio: Buffer[] = new Array(chunks.length)
  let next = 0

  async function worker() {
    while (next < chunks.length) {
      const index = next++
      const response = await openaiClient().audio.speech.create({
        model: SPEECH_MODEL,
        voice,
        input: chunks[index],
        instructions,
        response_format: 'mp3',
      })
      audio[index] = Buffer.from(await response.arrayBuffer())
    }
  }

  await Promise.all(Array.from({ length: Math.min(SPEECH_CONCURRENCY, chunks.length) }, worker))
  return joinMp3(audio)
}

function splitForSpeech(text: string): string[] {
  const pieces = text
    .split(/\n\s*\n|\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .flatMap(p => (p.length <= SPEECH_CHUNK_CHARS ? [p] : p.match(/[^.!?…]+[.!?…]+["”»']?\s*|[^.!?…]+$/g) ?? [p]))

  const chunks: string[] = []
  let current = ''
  for (const piece of pieces) {
    if (current && current.length + piece.length + 2 > SPEECH_CHUNK_CHARS) {
      chunks.push(current)
      current = ''
    }
    current = current ? `${current}\n\n${piece}` : piece
  }
  if (current) chunks.push(current)
  return chunks
}
