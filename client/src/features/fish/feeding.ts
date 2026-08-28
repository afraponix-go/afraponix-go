import { z } from 'zod'
import { api } from '../../lib/apiClient'

export const FEED_TYPES = ['Crumble', 'Pellet #2', 'Pellet #3', 'Pellet #4', 'Pellet #5', 'Pellet #6', 'Other']

// --- Feed recommendation model -------------------------------------------
//
// Daily ration (g) = biomass × feeding-rate(weight) × temperature-response ×
// species scale. This follows standard aquaculture practice rather than a flat
// percentage:
//
//  1. Feeding rate falls steeply with body weight. Fry eat 10-30% of body
//     weight/day; market-size fish ~1.5%. We interpolate a published-style
//     warm-water (tilapia) rate curve rather than use coarse buckets.
//  2. Fish are ectotherms — intake tracks metabolism, which rises toward a
//     species' optimal temperature and collapses toward its cold/hot limits.
//     We use a smooth (smoothstep) asymmetric response with a plateau, per
//     species, so a tilapia and a trout behave very differently at 25 °C.
//  3. Pellet size is matched to mouth gape (≈ body weight), and feeding
//     frequency (meals/day) is higher for small fish.
//
// These are planning guidelines; observed appetite (uneaten feed, behaviour)
// should always override.

function interp(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1]
  const last = pts[pts.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]
    const [x1, y1] = pts[i]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return last[1]
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// Body weight (g) → feeding rate (fraction of body weight/day) at optimal temp.
const RATE_POINTS: [number, number][] = [
  [1, 0.3], [3, 0.18], [5, 0.12], [10, 0.085], [20, 0.06], [35, 0.05],
  [50, 0.043], [75, 0.038], [100, 0.033], [150, 0.028], [250, 0.022],
  [400, 0.019], [600, 0.016], [1000, 0.014],
]

// Species thermal profile: optimal temp + cold/hot temps where feeding stops,
// and a metabolic rate scale relative to tilapia.
type Thermal = { optimal: number; coldStop: number; warmStop: number; scale: number }
const THERMAL: Record<string, Thermal> = {
  tilapia: { optimal: 29, coldStop: 15, warmStop: 37, scale: 1.0 },
  catfish: { optimal: 28, coldStop: 13, warmStop: 36, scale: 1.0 },
  bass: { optimal: 26, coldStop: 10, warmStop: 34, scale: 0.9 },
  trout: { optimal: 15, coldStop: 4, warmStop: 23, scale: 0.9 }, // cold-water
  goldfish: { optimal: 22, coldStop: 4, warmStop: 32, scale: 0.8 },
  koi: { optimal: 23, coldStop: 5, warmStop: 33, scale: 0.8 },
}
const DEFAULT_THERMAL: Thermal = { optimal: 27, coldStop: 12, warmStop: 35, scale: 1.0 }

function temperatureFactor(t: number, th: Thermal): number {
  const plateauLo = th.optimal - 2
  const plateauHi = th.optimal + 1
  if (t >= plateauLo && t <= plateauHi) return 1
  if (t < plateauLo) return smoothstep(th.coldStop, plateauLo, t) // 0 at coldStop → 1 at plateau
  return 1 - smoothstep(plateauHi, th.warmStop, t) // 1 at plateau → 0 at warmStop
}

// Pellet grade by body weight (mouth gape) — maps to FEED_TYPES.
export function recommendedPellet(w: number): string {
  if (w <= 0) return ''
  if (w < 15) return 'Crumble'
  if (w < 40) return 'Pellet #2'
  if (w < 100) return 'Pellet #3'
  if (w < 250) return 'Pellet #4'
  if (w < 500) return 'Pellet #5'
  return 'Pellet #6'
}

// Meals per day — small fish need frequent small feeds.
function feedingFrequency(w: number): number {
  if (w <= 0) return 0
  if (w < 10) return 6
  if (w < 50) return 4
  if (w < 200) return 3
  return 2
}

export type FeedSuggestion = {
  grams: number
  factor: number
  hasTemp: boolean
  note: string
  pellet: string
  frequency: number
  ratePct: number
}

export function suggestedFeed(
  count?: number | null,
  avgWeightG?: number | null,
  fishType?: string | null,
  waterTempC?: number | null,
): FeedSuggestion {
  const c = count ?? 0
  const w = avgWeightG ?? 0
  const hasTemp = waterTempC != null && Number.isFinite(waterTempC)
  const th = THERMAL[(fishType ?? '').toLowerCase()] ?? DEFAULT_THERMAL
  const pellet = recommendedPellet(w)
  const frequency = feedingFrequency(w)
  if (c <= 0 || w <= 0) return { grams: 0, factor: 1, hasTemp, note: '', pellet, frequency, ratePct: 0 }

  const rate = interp(w, RATE_POINTS) * th.scale
  const factor = hasTemp ? temperatureFactor(waterTempC as number, th) : 1
  const grams = Math.round(c * w * rate * factor)
  const ratePct = rate * factor * 100

  let note = ''
  if (hasTemp && factor < 0.9) note = (waterTempC as number) < th.optimal ? 'reduced — cool water' : 'reduced — warm water'
  else if (!hasTemp) note = 'assumes optimal temp'

  return { grams, factor, hasTemp, note, pellet, frequency, ratePct }
}

export function logFeeding(
  systemId: string,
  input: { date: string; fish_tank_id: number; feed_consumption: number; feed_type?: string; behavior?: string; notes?: string },
) {
  return api(`/data/fish-health/${systemId}`, { method: 'POST', body: input })
}

// Edit / delete a single logged feeding (a fish_health entry).
export function updateFeeding(entryId: number, input: { feed_consumption: number; feed_type?: string | null }) {
  return api(`/data/fish-health/entry/${entryId}`, { method: 'PUT', body: input })
}
export function deleteFeeding(entryId: number) {
  return api(`/data/fish-health/entry/${entryId}`, { method: 'DELETE' })
}

const num = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

const healthRow = z.object({
  id: z.number().optional(),
  fish_tank_id: num,
  date: z.string().nullable().optional(),
  feed_consumption: num,
  feed_type: z.string().nullable().optional(),
  behavior: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})
export type FeedingRecord = z.infer<typeof healthRow>

export async function fetchFeedingLog(systemId: string, limit = 400): Promise<FeedingRecord[]> {
  const data = await api<unknown[]>(`/data/fish-health/${systemId}?limit=${limit}`)
  const parsed = z.array(healthRow).safeParse(data)
  if (!parsed.success) return []
  // Only rows that actually recorded a feed amount.
  return parsed.data.filter((r) => r.feed_consumption != null && Number.isFinite(r.feed_consumption))
}
