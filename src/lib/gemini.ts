import { GoogleGenAI } from '@google/genai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY
if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY env var')

const ai = new GoogleGenAI({ apiKey })

export interface GeneratedSession {
  tldr: string
  story: string
}

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

export async function generateSession(prompt: string, fillGaps = false): Promise<GeneratedSession> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: fillGaps ? SYSTEM_INSTRUCTION_FILL_GAPS : SYSTEM_INSTRUCTION_FAITHFUL,
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
