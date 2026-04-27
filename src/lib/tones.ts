export interface Tone {
  id: string
  label: string
}

export const TONES: Tone[] = [
  { id: 'dark_fantasy', label: 'Dark Fantasy' },
  { id: 'epic_high_fantasy', label: 'Epic High Fantasy' },
  { id: 'comedic_chaotic', label: 'Comedic / Chaotic' },
  { id: 'bard', label: 'Narrated by a Bard' },
  { id: 'journal', label: "PC's Journal" },
]
