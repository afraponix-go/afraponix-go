import { z } from 'zod'
import { api } from '../../lib/apiClient'

// nutrient_readings is the single source of truth for ALL measured parameters —
// water-quality params (temperature, ph, dissolved_oxygen, …) and plant
// nutrients (potassium, iron, …) alike. Each is a typed reading with its own
// source attribution.
const nutrientReading = z.object({
  value: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  unit: z.string().nullable().optional(),
  reading_date: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
})
export type NutrientReading = z.infer<typeof nutrientReading>
export type LatestNutrients = Record<string, NutrientReading>

// Composite latest reading per parameter (newest row per nutrient_type).
export async function fetchLatestNutrients(systemId: string): Promise<LatestNutrients> {
  const data = await api<unknown>(`/data/nutrients/latest/${systemId}`)
  const parsed = z.record(z.string(), nutrientReading).safeParse(data)
  return parsed.success ? parsed.data : {}
}

// Per-nutrient target bands the dashboard scores readings against — either the
// system's pinned primary crop+stage, or (default) the most-demanding levels
// across the crops planted in the system.
export type BandKey = 'n' | 'p' | 'k' | 'ca' | 'mg' | 'fe'
export type Band = { floor: number | null; target: number | null; high?: number }
export type SystemTargets = {
  mode: 'auto' | 'primary'
  primary: { crop: string; stage: 'vegetative' | 'fruiting' } | null
  bands: Record<BandKey, Band | null>
  options: { code: string; name: string; hasFruiting: boolean }[]
}

// nutrient_readings key -> band key
export const NUTRIENT_BAND_KEY: Record<string, BandKey> = {
  nitrate: 'n', nitrogen: 'n', phosphorus: 'p', potassium: 'k', calcium: 'ca', magnesium: 'mg', iron: 'fe',
}

export async function fetchSystemTargets(systemId: string): Promise<SystemTargets> {
  return api<SystemTargets>(`/dosing/system-nutrient-targets/${systemId}`)
}

export async function setReferenceCrop(systemId: string, crop: string | null, stage?: 'vegetative' | 'fruiting') {
  return api(`/dosing/system-nutrient-targets/${systemId}`, { method: 'PUT', body: { crop, stage } })
}

// Classify a reading against a band.
export type BandStatus = 'low' | 'good' | 'high' | 'none'
export function bandStatus(value: number, band?: Band | null): BandStatus {
  if (!band || band.target == null) return 'none'
  if (band.floor != null && value < band.floor) return 'low'
  if (band.high != null && value > band.high) return 'high'
  return 'good'
}
