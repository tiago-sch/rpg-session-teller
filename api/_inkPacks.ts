export interface InkPack {
  id: string
  name: string
  inks: number
  unitAmount: number
  currency: string
  featured?: boolean
}

const INK_CURRENCY = (process.env.INK_CURRENCY || 'brl').toLowerCase()

export const INK_PACKS: InkPack[] = [
  {
    id: 'sample',
    name: 'Sample Drop',
    inks: 20,
    unitAmount: 400,
    currency: INK_CURRENCY,
  },
  {
    id: 'starter',
    name: 'Starter Vial',
    inks: 60,
    unitAmount: 1000,
    currency: INK_CURRENCY,
  },
  {
    id: 'scribe',
    name: 'Scribe Bottle',
    inks: 140,
    unitAmount: 2000,
    currency: INK_CURRENCY,
    featured: true,
  },
  {
    id: 'archivist',
    name: 'Archivist Cask',
    inks: 240,
    unitAmount: 3000,
    currency: INK_CURRENCY,
  },
]

export function getInkPack(packId: string) {
  return INK_PACKS.find(pack => pack.id === packId)
}
