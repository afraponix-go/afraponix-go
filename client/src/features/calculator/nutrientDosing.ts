import { api } from '../../lib/apiClient'

// Crop-target-based nutrient dosing. Targets come from the crop knowledge base
// (ppm, per crop); current levels come from the system's latest readings (the
// single nutrient_readings table). The dose to reach a target is:
//   grams of element = (target − current) ppm × reservoir litres ÷ 1000
// (1 ppm = 1 mg/L). A common fertiliser + its amount is shown as a guide.

export type Crop = {
  code: string
  name: string
  category_name?: string | null
  default_ec_min?: string | null
  default_ec_max?: string | null
  default_ph_min?: string | null
  default_ph_max?: string | null
}

export type Range = { target: number; min: number; max: number }

// The nutrients we can dose against — crop-target code → the reading key it maps
// to, plus a common fertiliser and its element mass fraction (approximate).
export const DOSING_NUTRIENTS = [
  { code: 'nitrogen', readKey: 'nitrate', label: 'Nitrogen', sub: 'as NO₃', fert: 'Calcium nitrate', frac: 0.155 },
  { code: 'phosphorus', readKey: 'phosphorus', label: 'Phosphorus', sub: 'P', fert: 'Mono-K phosphate', frac: 0.227 },
  { code: 'potassium', readKey: 'potassium', label: 'Potassium', sub: 'K', fert: 'Potassium sulphate', frac: 0.415 },
  { code: 'calcium', readKey: 'calcium', label: 'Calcium', sub: 'Ca', fert: 'Calcium nitrate', frac: 0.19 },
  { code: 'magnesium', readKey: 'magnesium', label: 'Magnesium', sub: 'Mg', fert: 'Epsom salt', frac: 0.098 },
  { code: 'iron', readKey: 'iron', label: 'Iron', sub: 'Fe', fert: 'Iron chelate (DTPA)', frac: 0.11 },
] as const

export async function fetchCrops(): Promise<Crop[]> {
  const data = await api<{ data?: Crop[] }>(`/crop-knowledge/crops`)
  return (data?.data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchRanges(cropCode: string): Promise<Record<string, Range>> {
  const data = await api<{ ranges?: Record<string, Range> }>(`/crop-knowledge/crops/${cropCode}/nutrient-ranges?stage=general`)
  return data?.ranges ?? {}
}

// Latest reading per metric. The endpoint returns the map either at the top
// level ({ nitrate: { value }, … }) or under a `nutrients` key — handle both.
export async function fetchLatestLevels(systemId: string): Promise<Record<string, number>> {
  const data = await api<Record<string, unknown>>(`/data/nutrients/latest/${systemId}`)
  const map = (data && typeof data === 'object' && 'nutrients' in data ? (data as { nutrients: unknown }).nutrients : data) as
    | Record<string, unknown>
    | undefined
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(map ?? {})) {
    const raw = v && typeof v === 'object' && 'value' in v ? (v as { value: unknown }).value : v
    const n = Number(raw)
    if (Number.isFinite(n)) out[k] = n
  }
  return out
}

export type DoseRow = {
  code: string
  label: string
  sub: string
  current: number | null
  target: number
  deficit: number // ppm to add (0 if at/above target)
  gramsElement: number
  fert: string
  gramsFert: number
}

// Build the dosing table for the given crop ranges, current levels and volume.
export function computeDoses(
  ranges: Record<string, Range>,
  current: Record<string, number | null>,
  volumeL: number,
): DoseRow[] {
  const rows: DoseRow[] = []
  for (const n of DOSING_NUTRIENTS) {
    const range = ranges[n.code]
    if (!range) continue
    const cur = current[n.readKey]
    const curVal = cur == null || Number.isNaN(cur) ? null : cur
    const deficit = Math.max(0, range.target - (curVal ?? 0))
    const gramsElement = volumeL > 0 ? (deficit * volumeL) / 1000 : 0
    rows.push({
      code: n.code,
      label: n.label,
      sub: n.sub,
      current: curVal,
      target: range.target,
      deficit,
      gramsElement,
      fert: n.fert,
      gramsFert: n.frac > 0 ? gramsElement / n.frac : 0,
    })
  }
  return rows
}
