import { GoogleGenAI } from '@google/genai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY
if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY env var')

const ai = new GoogleGenAI({ apiKey })

export interface GeneratedSession {
  tldr: string
  story: string
}

export interface Tone {
  id: string
  label: string
  instruction: string
}

export const TONES: Tone[] = [
  {
    id: 'dark_fantasy',
    label: 'Dark Fantasy',
    instruction: `Tone & Style — Dark Fantasy (The Witcher):
Write in a gritty, morally ambiguous register. The world is harsh and beautiful in equal measure. Heroes bear scars — physical and emotional — and victories are often pyrrhic. Use visceral, evocative imagery: blood on stone, shadows that breathe, the weight of exhaustion. Avoid triumphalism. Let dread and melancholy underpin even moments of courage. Prose should feel like it was written by someone who has seen too much.`,
  },
  {
    id: 'epic_high_fantasy',
    label: 'Epic High Fantasy',
    instruction: `Tone & Style — Epic High Fantasy (The Lord of the Rings):
Write with grandeur and gravitas. Every action carries the weight of legend, every choice echoes across ages. Use elevated, stately prose — long sentences that breathe with purpose, rich descriptions of landscape, lineage, and ancient things. The chronicle should feel like history being set down by a careful hand. Heroes may falter, but their deeds matter. The light exists because the darkness is real.`,
  },
  {
    id: 'comedic_chaotic',
    label: 'Comedic / Chaotic',
    instruction: `Tone & Style — Comedic / Chaotic Party:
Write with wit and warmth. The party is gloriously chaotic — their decisions are questionable, their tactics improvised, their victories accidental. Lean into absurdity. Use dry humour, comic timing, and affectionate exaggeration. Failures should be as memorable as successes, perhaps more so. The tone is that of a very funny story being told at the tavern by someone who was there and is still slightly incredulous that it worked out.`,
  },
  {
    id: 'bard',
    label: 'Narrated by a Bard',
    instruction: `Tone & Style — Narrated by a Bard:
Write as though performed aloud to a tavern crowd by a skilled bard. Address the audience occasionally ("But what did our heroes do next?", "And here, dear listeners, is where it gets interesting"). Use rhythmic, almost lyrical prose that swells and quiets. Dramatic pauses live in the punctuation. Embellish freely for effect — colour, spectacle, a touch of romance — but never contradict the facts. End moments with a flourish.`,
  },
  {
    id: 'journal',
    label: "PC's Journal",
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

export async function generateImage(prompt: string): Promise<{ base64: string; mimeType: string }> {
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: prompt,
    config: {
      responseModalities: ['IMAGE', 'TEXT'],
    },
  })

  const parts = response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType ?? 'image/png',
      }
    }
  }

  throw new Error('No image data returned from Gemini.')
}

export interface CampaignContext {
  notes?: string | null
  characters?: { name: string; notes?: string | null }[]
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      temperature: fillGaps ? 0.9 : 0.7,
    },
  })

  const text = response.text ?? ''
  const parsed = JSON.parse(text) as GeneratedSession

  if (!parsed.tldr || !parsed.story) {
    throw new Error('Gemini returned an unexpected response shape.')
  }

  return parsed
}
