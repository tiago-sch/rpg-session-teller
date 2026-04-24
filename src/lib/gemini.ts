import { GoogleGenAI } from '@google/genai'

const apiKey = import.meta.env.VITE_GEMINI_API_KEY
if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY env var')

const ai = new GoogleGenAI({ apiKey })

export interface GeneratedSession {
  tldr: string
  story: string
}

const SYSTEM_INSTRUCTION = `You are a faithful session chronicler for tabletop RPGs.
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

export async function generateSession(prompt: string): Promise<GeneratedSession> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      temperature: 0.7,
    },
  })

  const text = response.text ?? ''
  const parsed = JSON.parse(text) as GeneratedSession

  if (!parsed.tldr || !parsed.story) {
    throw new Error('Gemini returned an unexpected response shape.')
  }

  return parsed
}
