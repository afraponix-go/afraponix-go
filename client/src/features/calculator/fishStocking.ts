// Fish stocking maths, ported from the original app's constants.
// Max stocking density (kg/m³) and a per-fish volume rule-of-thumb (L) per species.
export const SPECIES = [
  { key: 'tilapia', label: 'Tilapia', maxDensity: 30, perFishVolume: 50 },
  { key: 'catfish', label: 'Catfish', maxDensity: 35, perFishVolume: 40 },
  { key: 'trout', label: 'Trout', maxDensity: 25, perFishVolume: 80 },
  { key: 'bass', label: 'Bass', maxDensity: 25, perFishVolume: 100 },
  { key: 'goldfish', label: 'Goldfish', maxDensity: 25, perFishVolume: 20 },
  { key: 'koi', label: 'Koi', maxDensity: 25, perFishVolume: 150 },
] as const

export type SpeciesKey = (typeof SPECIES)[number]['key']

export type StockingInput = {
  species: SpeciesKey
  volumeL: number
  harvestWeightG: number
  currentCount?: number
  currentWeightG?: number
}

export type StockingResult = {
  maxDensity: number
  maxBiomassKg: number
  maxFishAtHarvest: number | null
  byVolumeRule: number
  current: { biomassKg: number; densityKgM3: number; pctOfMax: number } | null
}

export function calcStocking(input: StockingInput): StockingResult | null {
  const s = SPECIES.find((x) => x.key === input.species)
  if (!s || !input.volumeL || input.volumeL <= 0) return null

  const volumeM3 = input.volumeL / 1000
  const maxBiomassKg = volumeM3 * s.maxDensity
  const maxFishAtHarvest =
    input.harvestWeightG > 0 ? Math.floor(maxBiomassKg / (input.harvestWeightG / 1000)) : null
  const byVolumeRule = Math.floor(input.volumeL / s.perFishVolume)

  let current: StockingResult['current'] = null
  if (input.currentCount && input.currentWeightG) {
    const biomassKg = (input.currentCount * input.currentWeightG) / 1000
    const densityKgM3 = biomassKg / volumeM3
    const pctOfMax = maxBiomassKg > 0 ? (biomassKg / maxBiomassKg) * 100 : 0
    current = { biomassKg, densityKgM3, pctOfMax }
  }

  return { maxDensity: s.maxDensity, maxBiomassKg, maxFishAtHarvest, byVolumeRule, current }
}
