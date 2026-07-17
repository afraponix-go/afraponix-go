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
