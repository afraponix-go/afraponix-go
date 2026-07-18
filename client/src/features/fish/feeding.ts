import { z } from 'zod'
import { api } from '../../lib/apiClient'

export const FEED_TYPES = ['Floating pellets', 'Sinking pellets', 'Growth feed', 'Fingerling feed', 'Other']

// Recommended daily feed (grams) = biomass × a size-based feed rate.
// Smaller fish eat a higher % of body weight (standard aquaculture rates).
export function suggestedFeed(count?: number | null, avgWeightG?: number | null): number {
  const c = count ?? 0
  const w = avgWeightG ?? 0
  if (c <= 0 || w <= 0) return 0
  const biomass = c * w
  const rate = w < 100 ? 0.04 : w < 200 ? 0.03 : w < 500 ? 0.025 : 0.02
  return Math.round(biomass * rate)
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
