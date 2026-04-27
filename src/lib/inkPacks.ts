export interface InkPack {
  id: string
  name: string
  inks: number
  unitAmount: number
  currency: 'usd'
  featured?: boolean
}

export const INK_PACKS: InkPack[] = [
  {
    id: 'sample',
    name: 'Sample Drop',
    inks: 20,
    unitAmount: 400,
    currency: 'usd',
  },
  {
    id: 'starter',
    name: 'Starter Vial',
    inks: 60,
    unitAmount: 1000,
    currency: 'usd',
  },
  {
    id: 'scribe',
    name: 'Scribe Bottle',
    inks: 140,
    unitAmount: 2000,
    currency: 'usd',
    featured: true,
  },
  {
    id: 'archivist',
    name: 'Archivist Cask',
    inks: 240,
    unitAmount: 3000,
    currency: 'usd',
  },
]

export function getInkPack(packId: string) {
  return INK_PACKS.find(pack => pack.id === packId)
}

export function formatPackPrice(pack: InkPack) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: pack.currency.toUpperCase(),
  }).format(pack.unitAmount / 100)
}
