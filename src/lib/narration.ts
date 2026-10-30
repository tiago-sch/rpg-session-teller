// Keep in sync with api/generate-audio.ts.
const CHARS_PER_INK = 4000

export const NARRATION_VOICES = [
  { id: 'onyx', label: 'Onyx — deep' },
  { id: 'cedar', label: 'Cedar — warm' },
  { id: 'ash', label: 'Ash — clear' },
  { id: 'fable', label: 'Fable — storyteller' },
  { id: 'echo', label: 'Echo — calm' },
  { id: 'verse', label: 'Verse — expressive' },
  { id: 'ballad', label: 'Ballad — soft' },
  { id: 'marin', label: 'Marin — bright' },
  { id: 'coral', label: 'Coral — friendly' },
  { id: 'nova', label: 'Nova — lively' },
  { id: 'sage', label: 'Sage — gentle' },
  { id: 'shimmer', label: 'Shimmer — light' },
  { id: 'alloy', label: 'Alloy — neutral' },
] as const

export const DEFAULT_VOICE = 'onyx'

export function narrationCost(textLength: number) {
  return Math.max(1, Math.ceil(textLength / CHARS_PER_INK))
}
