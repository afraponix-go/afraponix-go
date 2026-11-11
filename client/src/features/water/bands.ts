// Health bands for water-quality / nutrient metrics, as a 3-tier model:
//   green (ok)     — within the optimal core [lo, hi]
//   amber (warn)   — marginal: between a hard bound and the optimal core
//   red (danger)   — critical: past a hard bound (min / max)
// The optimal cores match the target ranges shown on the Water Quality page
// (WATER_FIELDS.range); the hard bounds add the "critical" tier. Tuned for a
// tilapia + leafy-green aquaponics system — adjust here to retune every view.
export type BandState = 'ok' | 'warn' | 'danger' | 'none'

// min = hard low (below → red), lo = optimal low (below → amber),
// hi = optimal high (above → amber), max = hard high (above → red).
type Band = { min?: number; lo?: number; hi?: number; max?: number }

export const BANDS: Record<string, Band> = {
  ph: { min: 6.0, lo: 6.4, hi: 7.2, max: 7.8 },
  temperature: { min: 16, lo: 20, hi: 28, max: 32 },
  kh: { min: 2, lo: 4, hi: 8, max: 12 },
  ec: { min: 200, lo: 400, hi: 1200, max: 1600 },
  dissolved_oxygen: { min: 4, lo: 5 },
  humidity: { min: 35, lo: 50, hi: 75, max: 90 },
  salinity: { hi: 1.5, max: 3 },
  ammonia: { hi: 0.25, max: 1 },
  nitrite: { hi: 0.5, max: 1 },
  nitrate: { min: 5, lo: 20, hi: 150, max: 250 },
  iron: { min: 0.5, lo: 1, hi: 3, max: 5 },
  potassium: { min: 20, lo: 40, hi: 70, max: 120 },
  calcium: { min: 30, lo: 50, hi: 100, max: 150 },
  phosphorus: { min: 2, lo: 5, hi: 20, max: 40 },
  magnesium: { min: 6, lo: 12, hi: 18, max: 30 },
}

// Water temperature depends on the fish. Cold-water trout tolerate only
// 7–22 °C (above 22 or below 7 is dangerous), far below the tilapia-tuned
// default. A system with any trout tank uses the trout band — the cold-water
// species is the one at risk. Everything else keeps the default band.
export type FishTypes = ReadonlyArray<string | null | undefined> | string | null | undefined
const TROUT_TEMP: Band = { min: 7, lo: 9, hi: 20, max: 22 }
export function hasTrout(fishTypes: FishTypes): boolean {
  const list = typeof fishTypes === 'string' ? [fishTypes] : fishTypes ?? []
  return list.some((t) => typeof t === 'string' && /trout/i.test(t))
}

export function bandFor(key: string, fishTypes?: FishTypes): Band | undefined {
  if (key === 'temperature' && hasTrout(fishTypes)) return TROUT_TEMP
  return BANDS[key]
}

// The simple "in range" window for water temperature (dashboard tile, chart
// target band, entry-form hint). Default 18–30 °C; trout 7–22 °C.
export function temperatureTarget(fishTypes?: FishTypes): { min: number; max: number } {
  return hasTrout(fishTypes) ? { min: TROUT_TEMP.min as number, max: TROUT_TEMP.max as number } : { min: 18, max: 30 }
}

export const rangeText = (r: { min: number; max: number }) => `${r.min} - ${r.max}`

export function bandState(key: string, value: number | null | undefined, fishTypes?: FishTypes): BandState {
  const b = bandFor(key, fishTypes)
  if (value == null || !b) return 'none'
  if (b.min != null && value < b.min) return 'danger'
  if (b.max != null && value > b.max) return 'danger'
  if (b.lo != null && value < b.lo) return 'warn'
  if (b.hi != null && value > b.hi) return 'warn'
  return 'ok'
}
