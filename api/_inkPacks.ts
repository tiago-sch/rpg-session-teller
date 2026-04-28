export interface InkPack {
  id: string;
  name: string;
  inks: number;
  unitAmount: number;
  currency: string;
  badge?: string;
  featured?: boolean;
}

const INK_CURRENCY = "brl";

export const INK_PACKS: InkPack[] = [
  {
    id: "sample",
    name: "Sample Drop",
    inks: 20,
    unitAmount: 1200,
    currency: INK_CURRENCY,
  },
  {
    id: "starter",
    name: "Starter Vial",
    inks: 60,
    unitAmount: 3500,
    currency: INK_CURRENCY,
  },
  {
    id: "scribe",
    name: "Scribe Bottle",
    inks: 140,
    unitAmount: 7500,
    currency: INK_CURRENCY,
    featured: true,
  },
  {
    id: "archivist",
    name: "Archivist Cask",
    inks: 240,
    unitAmount: 12000,
    currency: INK_CURRENCY,
  },
];

export function getInkPack(packId: string) {
  return INK_PACKS.find((pack) => pack.id === packId);
}
