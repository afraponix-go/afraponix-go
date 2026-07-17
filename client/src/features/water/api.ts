import { z } from 'zod'
import { api } from '../../lib/apiClient'

// Water-quality parameters, all stored in nutrient_readings (the single source
// of truth). Field defs are shared by the form and the history table.
export const WATER_FIELDS = [
  { key: 'temperature', label: 'Water Temp', unit: '°C', step: '0.1' },
  { key: 'ph', label: 'pH', unit: '', step: '0.01' },
  { key: 'dissolved_oxygen', label: 'Dissolved O₂', unit: 'mg/L', step: '0.1' },
  { key: 'ammonia', label: 'Ammonia', unit: 'ppm', step: '0.01' },
  { key: 'nitrite', label: 'Nitrite', unit: 'ppm', step: '0.01' },
  { key: 'nitrate', label: 'Nitrate', unit: 'ppm', step: '0.1' },
  { key: 'ec', label: 'EC', unit: 'µS/cm', step: '1' },
  { key: 'humidity', label: 'Humidity', unit: '%', step: '1' },
  { key: 'salinity', label: 'Salinity', unit: 'ppt', step: '0.01' },
] as const

export type WaterFieldKey = (typeof WATER_FIELDS)[number]['key']

// ---- Write: one reading = several typed rows in nutrient_readings ----
export type WaterQualityInput = { date: string; notes?: string; values: Partial<Record<WaterFieldKey, number>> }

export async function createWaterQualityReading(systemId: string, input: WaterQualityInput) {
  // Store at noon so a reader's timezone offset can't shift the date to an
  // adjacent day when the datetime is later grouped by calendar date.
  const readingDate = `${input.date} 12:00:00`
  const nutrients = WATER_FIELDS.filter((f) => input.values[f.key] != null).map((f, i) => ({
    type: f.key,
    value: input.values[f.key],
    unit: f.unit,
    reading_date: readingDate,
    source: 'manual',
    ...(i === 0 && input.notes ? { notes: input.notes } : {}),
  }))
  return api(`/data/nutrients/${systemId}`, { method: 'POST', body: { nutrients } })
}

// ---- Read: pivot the normalized readings into one row per date ----
const readingRow = z.object({
  nutrient_type: z.string(),
  value: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  reading_date: z.string(),
})
export type HistoryRow = { date: string } & Partial<Record<WaterFieldKey, number>>

export async function fetchWaterQualityHistory(systemId: string, days = 12): Promise<HistoryRow[]> {
  const data = await api<unknown[]>(`/data/nutrients/${systemId}?limit=500`)
  const rows = z.array(readingRow).safeParse(data)
  if (!rows.success) return []

  const keys = new Set(WATER_FIELDS.map((f) => f.key as string))
  const byDate = new Map<string, HistoryRow>()
  for (const r of rows.data) {
    if (!keys.has(r.nutrient_type)) continue
    const date = r.reading_date.slice(0, 10)
    const row = byDate.get(date) ?? { date }
    // readings come newest-first, so keep the first (latest) value we see per day
    if ((row as Record<string, unknown>)[r.nutrient_type] == null) {
      ;(row as unknown as Record<string, number>)[r.nutrient_type] = r.value
    }
    byDate.set(date, row)
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, days)
}
