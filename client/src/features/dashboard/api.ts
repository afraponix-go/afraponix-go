import { z } from 'zod'
import { api } from '../../lib/apiClient'

// A water_quality row. Numeric columns arrive as strings or null.
const num = z.union([z.string(), z.number()]).nullable().optional().transform((v) => (v == null || v === '' ? null : Number(v)))

export const waterQualitySchema = z.object({
  date: z.string().nullable().optional(),
  temperature: num,
  ph: num,
  dissolved_oxygen: num,
  ammonia: num,
  nitrite: num,
  nitrate: num,
  ec: num,
  humidity: num,
  salinity: num,
  created_at: z.string().nullable().optional(),
})
export type WaterQuality = z.infer<typeof waterQualitySchema>

export async function fetchLatestWaterQuality(systemId: string): Promise<WaterQuality | null> {
  const data = await api<unknown>(`/data/water-quality/${systemId}?limit=1`)
  const rows = Array.isArray(data) ? data : []
  if (rows.length === 0) return null
  return waterQualitySchema.parse(rows[0])
}

// Composite latest nutrient readings, keyed by nutrient, each with its own
// source attribution (sensor / manual / calculated).
const nutrientReading = z.object({
  value: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  unit: z.string().nullable().optional(),
  reading_date: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
})
export type NutrientReading = z.infer<typeof nutrientReading>
export type LatestNutrients = Record<string, NutrientReading>

export async function fetchLatestNutrients(systemId: string): Promise<LatestNutrients> {
  const data = await api<unknown>(`/data/nutrients/latest/${systemId}`)
  const parsed = z.record(z.string(), nutrientReading).safeParse(data)
  return parsed.success ? parsed.data : {}
}
