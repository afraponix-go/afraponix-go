// Canonical grow-bed geometry. This is the single source of truth for bed
// area / volume / capacity, replacing the four divergent formulas in the old
// app. equivalent_m2 is the "effective growing area" the allocation math uses:
// footprint (L×W) for area beds, or plant-sites ÷ 25 for NFT/vertical.

export type BedShape = 'area' | 'nft' | 'vertical'
export type BedTypeDef = { value: string; label: string; shape: BedShape }

export const BED_TYPES: BedTypeDef[] = [
  { value: 'dwc', label: 'Deep Water Culture (DWC)', shape: 'area' },
  { value: 'media', label: 'Media Bed', shape: 'area' },
  { value: 'nft', label: 'NFT Channels', shape: 'nft' },
  { value: 'vertical', label: 'Vertical Tower', shape: 'vertical' },
]

// Plant sites per m² used to convert NFT/vertical capacity to an equivalent area.
const DENSITY = 25
// Fraction of a media bed's volume that holds water (rest is media).
const MEDIA_WATER_FRACTION = 0.4

// Normalize legacy bed_type aliases to the canonical set.
const ALIASES: Record<string, string> = {
  deep_water_culture: 'dwc',
  'flood-drain': 'media',
  flood_drain: 'media',
  ebb_flow: 'media',
  'media-flow': 'media',
  media_flow: 'media',
  raft: 'dwc',
  tower: 'vertical',
}
export function normalizeBedType(type?: string | null): string {
  const t = (type ?? '').toLowerCase().trim()
  return ALIASES[t] ?? t
}
export function bedTypeDef(type?: string | null): BedTypeDef | undefined {
  return BED_TYPES.find((t) => t.value === normalizeBedType(type))
}
export function bedTypeLabel(type?: string | null): string {
  return bedTypeDef(type)?.label ?? (type ?? 'Bed')
}
export function bedShape(type?: string | null): BedShape {
  return bedTypeDef(type)?.shape ?? 'area'
}

export type BedInputs = {
  length_meters?: number | null
  width_meters?: number | null
  height_meters?: number | null
  vertical_count?: number | null
  plants_per_vertical?: number | null
  trough_length?: number | null
  trough_count?: number | null
  plant_spacing?: number | null
  reservoir_volume_liters?: number | null
}

export type BedComputed = {
  area_m2: number
  equivalent_m2: number
  volume_liters: number
  plant_capacity: number | null
}

const n = (v: number | null | undefined) => (v == null || isNaN(v) ? 0 : v)

export function computeBed(type: string, i: BedInputs): BedComputed {
  const shape = bedShape(type)

  if (shape === 'vertical') {
    const cap = n(i.vertical_count) * n(i.plants_per_vertical)
    return {
      area_m2: n(i.length_meters) * n(i.width_meters),
      equivalent_m2: cap / DENSITY,
      volume_liters: n(i.length_meters) * n(i.width_meters) * n(i.height_meters) * 1000,
      plant_capacity: cap,
    }
  }

  if (shape === 'nft') {
    const perTrough = i.plant_spacing ? Math.floor((n(i.trough_length) * 100) / n(i.plant_spacing)) : 0
    const cap = perTrough * n(i.trough_count)
    return {
      area_m2: cap / DENSITY,
      equivalent_m2: cap / DENSITY,
      volume_liters: n(i.reservoir_volume_liters),
      plant_capacity: cap,
    }
  }

  // area beds (dwc / media)
  const area = n(i.length_meters) * n(i.width_meters)
  const waterFraction = normalizeBedType(type) === 'media' ? MEDIA_WATER_FRACTION : 1.0
  return {
    area_m2: area,
    equivalent_m2: area,
    volume_liters: area * n(i.height_meters) * 1000 * waterFraction,
    plant_capacity: null,
  }
}
