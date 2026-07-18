import { z } from 'zod'
import { api } from '../../lib/apiClient'

export const FEED_TYPES = ['Floating pellets', 'Sinking pellets', 'Growth feed', 'Fingerling feed', 'Other']

// --- Smart feed recommendation -------------------------------------------
// Daily feed (g) = biomass × size rate × temperature response.
// Fish are ectotherms: appetite peaks near a species' optimal temperature and
// falls to zero toward its cold/hot no-feed limits. Species therefore drives
// the temperature curve (a tilapia and a trout want very different things at
// the same water temp), while size drives the % of body weight.

type SpeciesProfile = { optimal: number; noFeedBelow: number; noFeedAbove: number }

// Optimal temp and no-feed bounds (°C) per species.
const SPECIES_PROFILES: Record<string, SpeciesProfile> = {
  tilapia: { optimal: 28, noFeedBelow: 15, noFeedAbove: 36 },
  catfish: { optimal: 27, noFeedBelow: 13, noFeedAbove: 35 },
  trout: { optimal: 14, noFeedBelow: 4, noFeedAbove: 22 }, // cold-water
  bass: { optimal: 25, noFeedBelow: 10, noFeedAbove: 33 },
  goldfish: { optimal: 21, noFeedBelow: 5, noFeedAbove: 30 },
  koi: { optimal: 22, noFeedBelow: 6, noFeedAbove: 31 },
}
const DEFAULT_PROFILE: SpeciesProfile = { optimal: 26, noFeedBelow: 12, noFeedAbove: 34 }

// % of body weight/day by size — smaller fish eat proportionally more.
function sizeRate(w: number): number {
  return w < 100 ? 0.04 : w < 200 ? 0.03 : w < 500 ? 0.025 : 0.02
}

// 0..1 appetite multiplier: full within a plateau around optimal, ramping to
// 0 at the no-feed bounds.
function temperatureResponse(t: number, p: SpeciesProfile): number {
  if (t <= p.noFeedBelow || t >= p.noFeedAbove) return 0
  const plateau = 2.5
  if (Math.abs(t - p.optimal) <= plateau) return 1
  if (t < p.optimal) {
    const lo = p.optimal - plateau
    return Math.max(0, Math.min(1, (t - p.noFeedBelow) / (lo - p.noFeedBelow)))
  }
  const hi = p.optimal + plateau
  return Math.max(0, Math.min(1, (p.noFeedAbove - t) / (p.noFeedAbove - hi)))
}

export type FeedSuggestion = { grams: number; factor: number; hasTemp: boolean; note: string }

export function suggestedFeed(
  count?: number | null,
  avgWeightG?: number | null,
  fishType?: string | null,
  waterTempC?: number | null,
): FeedSuggestion {
  const c = count ?? 0
  const w = avgWeightG ?? 0
  const hasTemp = waterTempC != null && Number.isFinite(waterTempC)
  if (c <= 0 || w <= 0) return { grams: 0, factor: 1, hasTemp, note: '' }

  const base = c * w * sizeRate(w)
  const profile = SPECIES_PROFILES[(fishType ?? '').toLowerCase()] ?? DEFAULT_PROFILE
  const factor = hasTemp ? temperatureResponse(waterTempC as number, profile) : 1

  let note = ''
  if (hasTemp && factor < 0.95) note = (waterTempC as number) < profile.optimal ? 'reduced — cool water' : 'reduced — warm water'
  else if (!hasTemp) note = 'no temp reading — assumes optimal'

  return { grams: Math.round(base * factor), factor, hasTemp, note }
}

export function logFeeding(
  systemId: string,
  input: { date: string; fish_tank_id: number; feed_consumption: number; feed_type?: string; behavior?: string; notes?: string },
) {
  return api(`/data/fish-health/${systemId}`, { method: 'POST', body: input })
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
})
export type FeedingRecord = z.infer<typeof healthRow>

export async function fetchFeedingLog(systemId: string, limit = 20): Promise<FeedingRecord[]> {
  const data = await api<unknown[]>(`/data/fish-health/${systemId}?limit=${limit}`)
  const parsed = z.array(healthRow).safeParse(data)
  if (!parsed.success) return []
  // Only rows that actually recorded a feed amount.
  return parsed.data.filter((r) => r.feed_consumption != null && Number.isFinite(r.feed_consumption))
}
